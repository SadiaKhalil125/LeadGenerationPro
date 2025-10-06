# run_scrape.py
import sys
import os
import requests
import traceback

# The API is running on the host machine.
# 'host.docker.internal' is a special DNS name that resolves to the host's IP
# from within a Docker container on Mac and Windows.
# We will pass this URL as an environment variable for flexibility.
API_BASE_URL = os.environ.get("API_URL", "http://host.docker.internal:8000")
TASK_EXECUTION_TIMEOUT = 300 # 5 minutes

def main():
    """
    Takes a task_id as a command-line argument and triggers its execution
    via an API call.
    """
    if len(sys.argv) < 2:
        print("Error: Missing task_id argument.", file=sys.stderr)
        sys.exit(1)

    task_id = sys.argv[1]
    print(f"Container starting execution for task_id: {task_id}")

    try:
        url = f"{API_BASE_URL}/task/execute-task/{task_id}"
        response = requests.post(url, timeout=TASK_EXECUTION_TIMEOUT)

        # Raise an exception for bad status codes (4xx or 5xx)
        response.raise_for_status()

        print(f"Successfully triggered task {task_id}.")
        print("API Response:", response.json())
        sys.exit(0) # Success

    except requests.RequestException as e:
        print(f"Error executing task {task_id}: {e}", file=sys.stderr)
        if e.response:
            print(f"Error Response Body: {e.response.text}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1) # Failure

if __name__ == "__main__":
    main()