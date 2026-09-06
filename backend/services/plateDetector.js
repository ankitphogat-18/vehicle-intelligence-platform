const sharp = require('sharp');

/**
 * Deterministically locates and crops the license plate region from a vehicle image
 * using vertical/horizontal edge gradient projections with Sharp.
 * 
 * @param {Buffer} inputBuffer - Raw image buffer
 * @returns {Promise<{ plateBuffer: Buffer, bbox: object | null, isCropped: boolean }>}
 */
async function locateAndCropPlate(inputBuffer) {
  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const origWidth = metadata.width || 800;
    const origHeight = metadata.height || 600;
    const aspectRatio = origWidth / origHeight;

    // If image is already an isolated plate crop (aspect ratio >= 2.2 and small height)
    if (aspectRatio >= 2.2 && (origHeight <= 250 || origWidth <= 600)) {
      return {
        plateBuffer: inputBuffer,
        bbox: { left: 0, top: 0, width: origWidth, height: origHeight },
        isCropped: false
      };
    }

    // Working resolution for fast edge projection
    const workWidth = 500;
    const scale = workWidth / origWidth;
    const workHeight = Math.round(origHeight * scale);

    const { data, info } = await image
      .resize(workWidth, workHeight, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;

    // Compute edge gradient map (Sobel difference)
    const edgeMap = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const diffX = Math.abs(data[idx + 1] - data[idx - 1]);
        const diffY = Math.abs(data[idx + w] - data[idx - w]);
        edgeMap[idx] = diffX * 1.6 + diffY * 0.4;
      }
    }

    // Search within the vehicle's bumper / plate zone (middle 80% horizontal, lower 75% vertical)
    const yStart = Math.floor(h * 0.30);
    const yEnd = Math.floor(h * 0.90);
    const xStart = Math.floor(w * 0.15);
    const xEnd = Math.floor(w * 0.85);

    // 1. Vertical Projection Profile (Row energy sum)
    const rowEnergy = new Float32Array(h);
    for (let y = yStart; y < yEnd; y++) {
      let sum = 0;
      for (let x = xStart; x < xEnd; x++) {
        sum += edgeMap[y * w + x];
      }
      rowEnergy[y] = sum / (xEnd - xStart);
    }

    // Find the band of rows with maximum character-like energy
    const bandHeight = Math.round(h * 0.14); // Expected plate height
    let bestY = yStart;
    let maxBandEnergy = -1;

    for (let y = yStart; y <= yEnd - bandHeight; y += 4) {
      let bandSum = 0;
      for (let dy = 0; dy < bandHeight; dy++) {
        bandSum += rowEnergy[y + dy];
      }
      if (bandSum > maxBandEnergy) {
        maxBandEnergy = bandSum;
        bestY = y;
      }
    }

    const plateTop = bestY;
    const plateBottom = bestY + bandHeight;

    // 2. Horizontal Projection Profile within the identified row band
    const colEnergy = new Float32Array(w);
    for (let x = xStart; x < xEnd; x++) {
      let colSum = 0;
      for (let y = plateTop; y < plateBottom; y++) {
        colSum += edgeMap[y * w + x];
      }
      colEnergy[x] = colSum / (plateBottom - plateTop);
    }

    // Find horizontal window with highest energy (width between 2.5x and 4.2x bandHeight)
    const targetPlateWidth = Math.min(Math.round(bandHeight * 3.4), xEnd - xStart);
    let bestX = xStart;
    let maxColEnergy = -1;

    for (let x = xStart; x <= xEnd - targetPlateWidth; x += 5) {
      let colSum = 0;
      for (let dx = 0; dx < targetPlateWidth; dx++) {
        colSum += colEnergy[x + dx];
      }
      // Weight centered positions slightly
      const distFromCenter = Math.abs((x + targetPlateWidth / 2) - w / 2) / (w / 2);
      const score = colSum * (1.0 - distFromCenter * 0.2);

      if (score > maxColEnergy) {
        maxColEnergy = score;
        bestX = x;
      }
    }

    // Convert coordinates back to original image scale with 10% safety margin
    const padX = Math.round(targetPlateWidth * 0.08 / scale);
    const padY = Math.round(bandHeight * 0.12 / scale);

    const cropLeft = Math.max(0, Math.round(bestX / scale) - padX);
    const cropTop = Math.max(0, Math.round(plateTop / scale) - padY);
    const cropWidth = Math.min(origWidth - cropLeft, Math.round(targetPlateWidth / scale) + padX * 2);
    const cropHeight = Math.min(origHeight - cropTop, Math.round(bandHeight / scale) + padY * 2);

    if (cropWidth > 50 && cropHeight > 15) {
      const croppedBuffer = await sharp(inputBuffer)
        .extract({
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight
        })
        .toBuffer();

      return {
        plateBuffer: croppedBuffer,
        bbox: {
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight
        },
        isCropped: true
      };
    }

    return {
      plateBuffer: inputBuffer,
      bbox: null,
      isCropped: false
    };
  } catch (err) {
    console.warn('[PlateDetector] Plate isolation notice:', err.message);
    return {
      plateBuffer: inputBuffer,
      bbox: null,
      isCropped: false
    };
  }
}

module.exports = {
  locateAndCropPlate
};
