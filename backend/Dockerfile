FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY fixtures ./fixtures

RUN useradd --create-home tatzpit && mkdir -p /app/data && chown -R tatzpit /app/data
USER tatzpit

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
