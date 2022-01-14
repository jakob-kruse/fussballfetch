#!/bin/bash

deno compile --unstable --allow-net --allow-read --allow-write --allow-env --target=x86_64-pc-windows-msvc --output=build/fussballfetch.exe src/index.ts