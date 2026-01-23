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

    def embed(
        self,
        texts: list[str],
        normalize: bool = True,
        text_type: str = "passage",
        ) -> list[list[float]]:
        """
                Generate embeddings for a list of texts.

                Takes a list of text strings and returns their vector representations.
                Each text is converted to a fixed-size vector (768 dimensions for BGE-base)
                that captures its semantic meaning.

                Args:
                    texts: List of texts to embed. Each text can be a word, sentence,
                        paragraph, or document.
                    normalize: Whether to L2-normalize embeddings. Defaults to True.
                    text_type: Type of text being embedded. Affects prefix used.

                Returns:
                    List of embedding vectors. Each vector is a list of floats
                    with length equal to embedding_dim.

                Raises:
                    RuntimeError: If model is not loaded.
                    ValueError: If text_type is not "query" or "passage".
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        if not texts:
            return []

        if text_type not in ["query", "passage"]:
            raise ValueError(f"text_type must be 'query' or 'passage', not {text_type}")

        # Add prefix for queries (improves BGE retrieval quality)
        prefix = QUERY_PREFIX if text_type == "query" else PASSAGE_PREFIX
        if prefix:
            texts = [prefix + text for text in texts]

        # Generate embeddings using sentence-transformers
        # - normalize_embeddings: L2-normalize for cosine similarity
        # - show_progress_bar: only show for large bathes to avoid clutter
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=normalize,
            show_progress_bar=True,
        )

        # Convert numpy arrays to Python lists for JSON serialization
        # FastAPI/Pydantic can't serialize numpy arrays directly
        if isinstance(embeddings, np.ndarray):
            return embeddings.tolist()

        return [emb.tolist() for emb in embeddings]

    def embed_single(
        self,
        text: str,
        normalize: bool = True,
        text_type: str = "passage",
    ) -> list[float]:

        """
        Generate embedding for a single text.

        Convenience method for embedding a single text string.
        Equivalent to embed([text], text_type=text_type)[0].

        Args:
            text: The text to embed. Can be a word, sentence, paragraph, or document.
            normalize: Whether to L2-normalize the embedding. Defaults to True.
            text_type: Type of text being embedded.

        Returns:
            Embedding vector as a list of floats with 768 dimensions (for BGE-base).
            Returns empty list if input text is empty.
            """
        embeddings = self.embed([text], normalize=normalize, text_type=text_type)
        return embeddings[0] if embeddings else []

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