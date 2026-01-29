from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check(request: Request):
    """
        Health check endpoint with model status.

        Returns the service status and information about the loaded embedding
        model. This endpoint does not check database connectivity or other
        external dependencies. It only verifies the ML model is loaded.

        Args:
            request: FastAPI request object. Used to access app.state
                where the embedding service is stored.

        Returns:
            Dictionary containing:
            - status (str): Always "ok" if the service is running
            - model (dict): Model information from EmbeddingService.info
                - model_name: Name of loaded model
                - embedding_dim: Dimension of embeddings
                - load_time_seconds: Time taken to load model
                - is_loaded: Whether model is ready for inference

        """
    embedding_service = request.app.state.embedding_service
    skill_extractor_service = request.app.state.skill_extractor_service

    return {
        "status": "ok",
        "embedding_model": embedding_service.info,
        "skill_model": skill_extractor_service.info,
    }
