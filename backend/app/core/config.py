from pydantic_settings import BaseSettings, SettingsConfigDict


PLATFORM_TO_REGIONAL = {
    "na1": "americas",
    "euw1": "europe",
    "kr": "asia",
    "br1": "americas",
    "eun1": "europe",
    "jp1": "asia",
    "lan1": "americas",
    "las1": "americas",
    "oc1": "sea",
    "tr1": "europe",
    "ru": "europe",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    RIOT_API_KEY: str = "RGAPI-placeholder"
    RIOT_REGION: str = "na1"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    DATABASE_PATH: str = "./elopath.db"

    @property
    def regional_host(self) -> str:
        region = PLATFORM_TO_REGIONAL.get(self.RIOT_REGION, "americas")
        return f"https://{region}.api.riotgames.com"

    @property
    def platform_host(self) -> str:
        return f"https://{self.RIOT_REGION}.api.riotgames.com"


settings = Settings()
