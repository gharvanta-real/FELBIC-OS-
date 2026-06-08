# AIOS IPC Client — Python helper to query aisd Unix Domain Socket
import socket
import struct
import msgpack
import threading
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AiosIpc")

SOCKET_PATH = "/run/aios/aisd.sock"

class AiosIpcClient:
    def __init__(self, socket_path=SOCKET_PATH):
        self.socket_path = socket_path
        self._lock = threading.Lock()

    def _send_request(self, method, params=None, req_id=1):
        payload = {
            "id": req_id,
            "method": method,
            "params": params or {}
        }
        
        try:
            # Connect to socket
            client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            client.connect(self.socket_path)
            
            # Encode to MessagePack
            encoded = msgpack.packb(payload)
            length = len(encoded)
            
            # Write big-endian u32 length followed by payload
            client.sendall(struct.pack(">I", length) + encoded)
            
            # Read response length
            len_bytes = client.recv(4)
            if not len_bytes or len(len_bytes) < 4:
                logger.error("Failed to read response length prefix")
                client.close()
                return {"success": False, "error": "Empty or partial length prefix"}
                
            resp_len = struct.unpack(">I", len_bytes)[0]
            
            # Read payload
            data = b""
            while len(data) < resp_len:
                chunk = client.recv(resp_len - len(data))
                if not chunk:
                    break
                data += chunk
                
            client.close()
            
            if len(data) < resp_len:
                logger.error("Incomplete payload read")
                return {"success": False, "error": "Incomplete payload"}
                
            # Decode response
            response = msgpack.unpackb(data, raw=False)
            return response
            
        except Exception as e:
            logger.error(f"IPC Error on method '{method}': {e}")
            return {"success": False, "error": str(e)}

    def ping(self):
        resp = self._send_request("ping")
        return resp.get("success", False) and resp.get("result", {}).get("pong") == True

    def query_ai(self, prompt, callback=None):
        """
        Sends an AI prompt request. If a callback is provided, runs on a background thread.
        """
        def run():
            resp = self._send_request("ai/query", {"prompt": prompt})
            if callback:
                if resp.get("success"):
                    # Extract the response key from the result object
                    res_val = resp.get("result", {}).get("response", "")
                    callback(res_val, None)
                else:
                    callback(None, resp.get("error", "Unknown daemon error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def get_stats(self, callback=None):
        def run():
            resp = self._send_request("stats/get")
            if callback:
                if resp.get("success"):
                    callback(resp.get("result"), None)
                else:
                    callback(None, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def search_files(self, query, limit=10, callback=None):
        def run():
            resp = self._send_request("fs/search", {"query": query, "limit": limit})
            if callback:
                if resp.get("success"):
                    callback(resp.get("result"), None)
                else:
                    callback(None, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def list_files(self, path="", callback=None):
        def run():
            resp = self._send_request("fs/list", {"path": path})
            if callback:
                if resp.get("success"):
                    callback(resp.get("result"), None)
                else:
                    callback(None, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def read_file(self, path, callback=None):
        def run():
            resp = self._send_request("fs/read", {"path": path})
            if callback:
                if resp.get("success"):
                    callback(resp.get("result"), None)
                else:
                    callback(None, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def write_file(self, path, content, callback=None):
        def run():
            resp = self._send_request("fs/write", {"path": path, "content": content})
            if callback:
                if resp.get("success"):
                    callback(True, None)
                else:
                    callback(False, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def get_processes(self, callback=None):
        def run():
            resp = self._send_request("process/list")
            if callback:
                if resp.get("success"):
                    callback(resp.get("result"), None)
                else:
                    callback(None, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def kill_process(self, pid, signal=None, callback=None):
        def run():
            params = {"pid": pid}
            if signal is not None:
                params["signal"] = signal
            resp = self._send_request("process/kill", params)
            if callback:
                if resp.get("success"):
                    callback(True, None)
                else:
                    callback(False, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()

    def set_system_control(self, action, value, callback=None):
        def run():
            resp = self._send_request("system/control", {"action": action, "value": value})
            if callback:
                if resp.get("success"):
                    callback(True, None)
                else:
                    callback(False, resp.get("error"))
            return resp

        if callback:
            threading.Thread(target=run, daemon=True).start()
        else:
            return run()
