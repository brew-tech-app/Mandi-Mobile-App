#!/bin/bash
while true; do
  count=$(ls -1 Pods 2>/dev/null | wc -l | xargs)
  total=65
  percent=$((count * 100 / total))
  timestamp=$(date '+%I:%M:%S %p')
  echo "[$timestamp] 📦 Pod Installation: $count/$total pods ($percent%)"
  sleep 120
done
