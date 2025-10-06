# Dockerfile
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the Python dependencies
# Ensure this includes 'requests' and any libraries your scraper needs
# (e.g., beautifulsoup4, playwright, lxml).
RUN pip install -r requirements.txt

# Copy the new runner script into the container
COPY run_scrape.py .

# This is the command that will be run when the container starts.
# We will append the <task_id> to this command when we run the container.
ENTRYPOINT ["python", "run_scrape.py"]