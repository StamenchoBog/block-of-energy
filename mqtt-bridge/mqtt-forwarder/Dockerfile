FROM python:3.13-slim AS builder

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential

COPY requirements.txt ./

RUN python -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim

RUN useradd --create-home appuser
WORKDIR /home/appuser
USER appuser

COPY --from=builder /opt/venv /home/appuser/venv

COPY mqtt-forwarder.py .

ENV PATH="/home/appuser/venv/bin:$PATH"

CMD [ "python", "-u", "./mqtt-forwarder.py" ]
