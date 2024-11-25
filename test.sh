#!/bin/bash
netstat -tuln | grep 8554
telnet localhost 8554

# Check current firewall settings
sudo firewall-cmd --list-ports

# Add port 8554 if it's not listed
sudo firewall-cmd --add-port=8554/tcp --permanent
sudo firewall-cmd --reload

