from pydantic import BaseModel, Field


class AverageMeter(object):
    """From https://github.com/pytorch/examples/blob/master/imagenet/main.py"""

    def __init__(self):
        self.val = 0
        self.avg = 0
        self.sum = 0
        self.count = 0

    def __repr__(self):
        return f'{self.avg:.2e}'

    def update(self, val, n=1):
        self.val = val
        self.sum += val * n
        self.count += n
        self.avg = self.sum / self.count


class TrainingArgs(BaseModel):
    """Pydantic model for training configuration.
    
    This provides type safety, validation, and proper serialization
    (including pickle support for multiprocessing).
    """
    
    numIters: int = Field(default=100, description="Number of training iterations")
    numEps: int = Field(default=100, description="Number of self-play games per iteration")
    tempThreshold: int = Field(default=15, description="Temperature threshold for exploration")
    updateThreshold: float = Field(default=0.55, description="New model acceptance threshold")
    maxlenOfQueue: int = Field(default=200000, description="Max training examples in queue")
    numMCTSSims: int = Field(default=50, description="MCTS simulations per move")
    arenaCompare: int = Field(default=40, description="Games for model comparison")
    cpuct: float = Field(default=1.5, description="Exploration constant")
    maxSearchDepth: int = Field(default=500, description="Max MCTS search depth")
    checkpoint: str = Field(default="./checkpoints/", description="Checkpoint directory")
    load_model: bool = Field(default=False, description="Whether to load existing model")
    load_folder_file: tuple[str, str] = Field(
        default=("./checkpoints/", "best.pth.tar"),
        description="Folder and file for loading model"
    )
    numItersForTrainExamplesHistory: int = Field(
        default=20, 
        description="Number of iterations to keep training examples"
    )
    
    class Config:
        """Pydantic config for pickle support."""
        frozen = False  # Allow mutation
        extra = "allow"  # Allow extra fields for flexibility


class dotdict(dict):
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

    def __setattr__(self, name, value):
        self[name] = value

    def __delattr__(self, name):
        try:
            del self[name]
        except KeyError:
            raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

    def __getstate__(self):
        return dict(self)

    def __setstate__(self, state):
        self.update(state)
