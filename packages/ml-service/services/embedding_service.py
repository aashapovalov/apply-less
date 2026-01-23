"""
Embedding Service Module

This module provides text embedding generation using sentence-transformers.
It loads a pre-trained model (default: BGE-base-en-v1.5) and generates
768-dimensional vector representations of text that can be used for
semantic similarity search.
"""

import time
from sentence_transformers import SentenceTransformer
import numpy as np

from config import get_settings

# BGE model instruction prefixes for better retrieval quality
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
PASSAGE_PREFIX  = "" # No prefix for documents and passages

class EmbeddingService:
    """
    This service wraps a SentenceTransformer model and provides methods
    for generating embeddings from text.

    Attributes:
        model: The loaded SentenceTransformer model instance, or None
            if not yet loaded.
        model_name: Name of the loaded model (e.g., "BAAI/bge-base-en-v1.5").
            Empty string if model not loaded.
        embedding_dim: Dimension of output embeddings (768 for BGE-base).
            Zero if model not loaded.
    """

    def __init__(self) -> None:
        """
        Initialize the EmbeddingService.

        The model is NOT loaded during initialization.
        """
        self.model: SentenceTransformer | None = None
        self.model_name: str = ""
        self.embedding_dim: int = 0
        self._load_time: float = 0

    def load_model(self) -> None:
        """
        Load the embedding model into memory.

        This method performs the following:
        1. Reads model name from settings (MODEL_NAME env var)
        2. Downloads model from HuggingFace Hub (if not cached)
        3. Loads model into memory (CPU or GPU if available)
        4. Stores model metadata (name, dimensions, load time)

        The model is cached locally in MODEL_CACHE_DIR (default: ./model_cache)
        so subsequent loads are much faster (no download needed).

        Raises:
            OSError: If model download fails (network error, invalid model name).
            RuntimeError: If model loading fails (out of memory, etc.).
        """
        settings = get_settings()

        print(f"📥 Loading model: { settings.embed_model_name }")
        start = time.time()

        # Load model using sentence-transformers
        # - cache-folder: where to store  downloaded files
        self.model = SentenceTransformer(
            settings.embed_model_name,
            cache_folder=settings.embed_model_cache_dir,
        )

        self._load_time = time.time() - start
        self.model_name = settings.embed_model_name
        self.embedding_dim = self.model.get_sentence_embedding_dimension()

        print(f"✅ Model loaded in {self._load_time:.2f}s")
        print(f"   Embedding dimension: {self.embedding_dim}")

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    @property
    def info(self) -> dict:
        return {
            "model_name": self.model_name,
            "embedding_dim": self.embedding_dim,
            "load_time_seconds": round(self._load_time, 2),
            "is_loaded": self.is_loaded
        }