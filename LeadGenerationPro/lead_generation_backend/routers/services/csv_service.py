import pandas as pd
from io import BytesIO

async def parse_csv(file):
    content = await file.read()
    df = pd.read_csv(BytesIO(content))

    contacts = df.to_dict(orient="records")

    return contacts