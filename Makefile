network:
	jq '[.traceEvents[] | select(.name == "WebSocketReceive") | .args.data.dataLength] | add' $1