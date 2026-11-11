from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    inference_token: str = "dev-token"
    max_input_bytes: int = 20 * 1024 * 1024
    max_input_side: int = 8000
    min_input_side: int = 32
    torch_device: str = "auto"
    models_dir: str = "./models"
    local_storage_dir: str = "./data"
    max_side: int = 4096
    max_jobs_kept: int = 200
    ocr_engine: str = "auto"
    max_concurrent_jobs: int = 2
    enable_diffusion: bool = False
    enable_upscale: bool = True


settings = Settings()
