use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use std::io::{Read, Write};
use std::os::unix::net::UnixStream;
use std::path::PathBuf;

const MAX_FRAME_BYTES: usize = 8 * 1024 * 1024;

#[derive(Serialize)]
struct Request {
    id: u64,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct Response {
    success: bool,
    #[serde(default)]
    result: Option<serde_json::Value>,
    #[serde(default)]
    error: Option<String>,
}

fn main() -> Result<()> {
    let mut args = env::args().skip(1).collect::<Vec<_>>();
    if args.is_empty() {
        print_help();
        return Ok(());
    }

    let command = args.remove(0);
    let (method, params) = match command.as_str() {
        "ping" => ("ping", None),
        "status" | "version" => ("version", None),
        "capabilities" | "caps" => ("capabilities", None),
        "stats" => ("stats/get", None),
        "ps" | "processes" => ("process/list", None),
        "index" => ("fs/index", None),
        "search" => {
            let query = args.join(" ");
            if query.trim().is_empty() {
                return Err(anyhow!("usage: felbicos-ai search <query>"));
            }
            ("fs/search", Some(json!({ "query": query, "limit": 10 })))
        }
        "ask" | "query" | "ai" => {
            let prompt = args.join(" ");
            if prompt.trim().is_empty() {
                return Err(anyhow!("usage: felbicos-ai ask <prompt>"));
            }
            ("ai/query", Some(json!({ "prompt": prompt })))
        }
        "ls" | "list" => {
            let path = args.first().cloned().unwrap_or_default();
            ("fs/list", Some(json!({ "path": path })))
        }
        "cat" | "read" => {
            let path = args
                .first()
                .ok_or_else(|| anyhow!("usage: felbicos-ai read <path>"))?;
            ("fs/read", Some(json!({ "path": path })))
        }
        "write" => {
            if args.len() < 2 {
                return Err(anyhow!("usage: felbicos-ai write <path> <content>"));
            }
            ("fs/write", Some(json!({ "path": args[0], "content": args[1] })))
        }
        "kill" => {
            let pid = args
                .first()
                .ok_or_else(|| anyhow!("usage: felbicos-ai kill <pid> [signal]"))?
                .parse::<i64>()?;
            let signal = args.get(1).and_then(|s| s.parse::<i64>().ok());
            ("process/kill", Some(json!({ "pid": pid, "signal": signal })))
        }
        _ => {
            print_help();
            return Err(anyhow!("unknown command: {}", command));
        }
    };

    let response = call(method, params)?;
    if response.success {
        match response.result {
            Some(value) => println!("{}", serde_json::to_string_pretty(&value)?),
            None => println!("ok"),
        }
        Ok(())
    } else {
        Err(anyhow!(
            "{}",
            response.error.unwrap_or_else(|| "request failed".to_string())
        ))
    }
}

fn call(method: &str, params: Option<serde_json::Value>) -> Result<Response> {
    let socket = env::var("AISD_SOCKET")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/run/aios/aisd.sock"));
    let mut stream = UnixStream::connect(&socket)
        .map_err(|e| anyhow!("failed to connect to {:?}: {}", socket, e))?;

    let request = Request {
        id: 1,
        method: method.to_string(),
        params,
    };
    let payload = rmp_serde::to_vec_named(&request)?;
    if payload.len() > MAX_FRAME_BYTES {
        return Err(anyhow!("request is too large"));
    }

    stream.write_all(&(payload.len() as u32).to_be_bytes())?;
    stream.write_all(&payload)?;
    stream.flush()?;

    let mut len_buf = [0_u8; 4];
    stream.read_exact(&mut len_buf)?;
    let len = u32::from_be_bytes(len_buf) as usize;
    if len == 0 || len > MAX_FRAME_BYTES {
        return Err(anyhow!("invalid response frame length: {}", len));
    }

    let mut response_buf = vec![0_u8; len];
    stream.read_exact(&mut response_buf)?;
    Ok(rmp_serde::from_slice(&response_buf)?)
}

fn print_help() {
    eprintln!(
        "felbicos-ai <command>\n\n  status | ping | stats | caps\n  index\n  ask <prompt>\n  search <query>\n  list [path]\n  read <path>\n  write <path> <content>\n  ps\n  kill <pid> [signal]"
    );
}
