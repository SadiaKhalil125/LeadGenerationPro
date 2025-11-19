#!/bin/bash
python startup.py &
python worker.py &
python status_updater.py
wait
