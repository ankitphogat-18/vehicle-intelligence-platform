const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { normalizeIndianPlate } = require('./plateNormalizer');
const { locateAndCropPlate } = require('./plateDetector');

/**
 * Preprocesses a plate image buffer using Sharp for optimal character recognition.
 * @param {Buffer} inputBuffer 
 * @returns {Promise<Buffer>} Preprocessed buffer
 */
async function preprocessPlateImage(inputBuffer) {
  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    // Ensure adequate resolution for stroke analysis
    const targetWidth = metadata.width && metadata.width < 600 ? 600 : undefined;

    let pipeline = image
      .resize({
        width: targetWidth,
        withoutEnlargement: false,
        fit: 'inside'
      })
      .grayscale()
      .normalize() // Stretch histogram to maximize character contrast
      .sharpen({ sigma: 1.5, m1: 1.5, m2: 0.5 }) // Emphasize stroke edges
      .extend({
        top: 15,
        bottom: 15,
        left: 20,
        right: 20,
        background: { r: 255, g: 255, b: 255 } // White padding around crop for clean Tesseract borders
      });

    return await pipeline.png().toBuffer();
  } catch (error) {
    console.warn('[OCR Service] Image preprocessing warning:', error.message);
    return inputBuffer;
  }
}

/**
 * Executes ANPR: first isolates the license plate region, then preprocesses and executes Tesseract OCR.
 * @param {Buffer} imageBuffer 
 * @returns {Promise<object>} Structured ANPR/OCR result
 */
async function recognizePlate(imageBuffer) {
  const startTime = Date.now();

  // 1. Automatically isolate the license plate region
  const { plateBuffer, bbox, isCropped } = await locateAndCropPlate(imageBuffer);

  // 2. Preprocess the isolated region
  const preprocessedBuffer = await preprocessPlateImage(plateBuffer);

  // 3. Perform OCR on the isolated plate region
  let ocrResult = await Tesseract.recognize(preprocessedBuffer, 'eng', {
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
  });

  let rawText = ocrResult.data.text ? ocrResult.data.text.trim() : '';
  let rawConfidence = typeof ocrResult.data.confidence === 'number' ? ocrResult.data.confidence : 0;
  let normalized = normalizeIndianPlate(rawText);

  // 4. Fallback: If isolated crop yielded no valid plate and was cropped, try full image
  if (!normalized.isValidFormat && isCropped) {
    const fallbackPreprocessed = await preprocessPlateImage(imageBuffer);
    const fallbackOcr = await Tesseract.recognize(fallbackPreprocessed, 'eng', {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -',
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
    });

    const fallbackRaw = fallbackOcr.data.text ? fallbackOcr.data.text.trim() : '';
    const fallbackNorm = normalizeIndianPlate(fallbackRaw);

    if (fallbackNorm.isValidFormat || fallbackOcr.data.confidence > rawConfidence) {
      ocrResult = fallbackOcr;
      rawText = fallbackRaw;
      rawConfidence = fallbackOcr.data.confidence;
      normalized = fallbackNorm;
    }
  }

  const durationMs = Date.now() - startTime;

  // Calculate normalized confidence (0.0 to 1.0)
  let confidence = Math.min(1.0, Math.max(0.0, rawConfidence / 100));

  // If format is standard Indian plate, reflect format consistency
  if (normalized.isValidFormat && confidence < 0.85) {
    confidence = Math.min(0.92, confidence + 0.1);
  }

  // Convert cropped plate to base64 for visualization in frontend
  let croppedBase64 = null;
  try {
    const pngBuffer = await sharp(plateBuffer).png().toBuffer();
    croppedBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    croppedBase64 = null;
  }

  return {
    success: true,
    plateNumber: normalized.normalizedPlate || rawText.replace(/[^A-Za-z0-9]/g, ''),
    rawText: rawText,
    confidence: Number(confidence.toFixed(2)),
    isValidFormat: normalized.isValidFormat,
    stateCode: normalized.stateCode,
    rtoCode: normalized.rtoCode,
    series: normalized.series,
    uniqueNumber: normalized.uniqueNumber,
    correctionApplied: normalized.correctionApplied,
    processingTimeMs: durationMs,
    plateRegionDetected: isCropped || bbox !== null,
    bbox: bbox,
    croppedPlateImage: croppedBase64,
    humanVerificationRequired: true,
    advisory: 'AI output is probabilistic. Human confirmation is required for investigation actions.',
    metadata: {
      wordsCount: (ocrResult.data.words || []).length,
      linesCount: (ocrResult.data.lines || []).length
    }
  };
}

module.exports = {
  recognizePlate,
  preprocessPlateImage
};
