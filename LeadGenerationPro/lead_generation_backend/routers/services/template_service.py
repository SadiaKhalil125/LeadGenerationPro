from jinja2 import Template

def render_template(template_str: str, data: dict):
    return Template(template_str).render(**data)