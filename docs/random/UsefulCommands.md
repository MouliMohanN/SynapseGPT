### Kill Metro server

#### Find the Process ID (PID): Open your terminal and run this command:

`lsof -i :8081`

#### Stop the Process: Use the kill command with the PID you found. For example, if the PID is 98765:

`kill -9 98765`

---

### Open Terminal

#### iterm2

`open -a iTerm .`

#### Warp

`shift+command+c`

### Delete git branches

`git branch | grep -v "develop" | xargs git branch -D`

### Other commands

#### Install app on specific device when multiple devices are connected via ABD

`adb -s <device_id> install <path_to_your_apk>`
