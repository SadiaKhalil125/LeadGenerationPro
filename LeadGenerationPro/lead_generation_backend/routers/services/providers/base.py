from abc import ABC, abstractmethod

class BaseProvider(ABC):

    @abstractmethod
    async def send(self, subject: str, body: str, contact: dict):
        pass