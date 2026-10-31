import os
import gradio as gr
from server import app as fastapi_app

# Create a lightweight Gradio interface (required by Hugging Face Gradio SDK)
with gr.Blocks(title="City-Wide Vehicle ANPR Vision Engine") as demo:
    gr.Markdown("## 🚗 City-Wide Vehicle Intelligence & ANPR Engine")
    gr.Markdown(
        "API service is active. This space serves both the web preview and "
        "the REST endpoints `POST /predict-image` and `POST /predict-video` "
        "for the City-Wide Vehicle Intelligence Platform."
    )

# Mount Gradio onto the existing FastAPI application
# When Hugging Face launches the space, both the Gradio UI and all FastAPI API endpoints are active!
app = gr.mount_gradio_app(fastapi_app, demo, path="/ui")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
