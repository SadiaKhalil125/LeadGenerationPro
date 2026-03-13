from .providers.factory import ProviderFactory
from .template_service import render_template
from .outreach_config import settings

async def execute_campaign(request):
    """
    Execute email campaign using the provider factory pattern
    """
    # Get the appropriate provider from factory
    provider = ProviderFactory.get_provider(
        request.provider,
        request.config
    )
    # print (f"Executing campaign with provider: {request.provider}")
    results = []

    for contact in request.contacts:
        try:
            # Skip if contact has no email
            if not contact.get("email"):
                results.append({
                    "email": contact.get("email", "unknown"),
                    "status": "failed",
                    "error": "No email address provided"
                })
                continue

            # Combine contact data with sender info for template rendering
            template_data = {
                **contact,  # All contact fields (name, email, company, etc.)
                "sender_name": settings.SENDGRID_FROM_NAME or settings.SMTP_NAME_FROM
            }
            
            # Jinja2 will replace {{name}}, {{company}}, {{sender_name}}, etc.
            body = render_template(request.message, template_data)
            subject = render_template(request.subject, template_data)
           

            # Send email using the provider
            result = await provider.send(
                subject=subject,
                message=body,
                contact=contact  # Send single contact instead of list
            )

            # Format result consistently
            if isinstance(result, dict):
                results.append(result)
            else:
                results.append({
                    "email": contact["email"],
                    "status": "sent",
                    "message": str(result)
                })

        except Exception as e:
            results.append({
                "email": contact.get("email", "unknown"),
                "status": "failed",
                "error": str(e)
            })

    return results