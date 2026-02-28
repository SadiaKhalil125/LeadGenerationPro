from .smtp import SMTPProvider
from .sendgrid import SendGridProvider


class ProviderFactory:

    @staticmethod
    def get_provider(provider_name: str, config: dict):

        providers = {
            "smtp": SMTPProvider,
            "sendgrid": SendGridProvider
        }

        provider_class = providers.get(provider_name.lower())

        if not provider_class:
            raise ValueError("Unsupported provider")

        return provider_class(config)