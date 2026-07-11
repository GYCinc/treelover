bun run dev &
sleep 5
curl -s http://localhost:3000 > /dev/null && echo "Server running successfully!"
kill %1
