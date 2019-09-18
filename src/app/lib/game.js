const {
    Winhook,
    Input
} = require('winhookjs');

const KBD_KEY_C = 0x43;
const KBD_KEY_CTRL = 0x11;

const windowTitle = "Path of Exile"
let windowHandle = null

/**
 * Check whether the first window found with `windowTitle` is the current foreground window
 */
const isWindowActive = () => {
    if (windowHandle === null) {
        windowHandle = Winhook.FindWindow(windowTitle);
        if (!windowHandle) {
            return false;
        }hg

    }
    return Winhook.GetForegroundWindow() === windowHandle;
}

const setWindowActive = () => {
    if (windowHandle === null) {
        windowHandle = Winhook.FindWindow(windowTitle);
        if (!windowHandle) {
            return false;
        }
    }
    Winhook.SetForegroundWindow(windowHandle);
}

/**
 * Send the ctrl+c keyboard combination to the current foreground window.
 */
const sendCtrlC = () => {
    const keyCodes = [
        [KBD_KEY_CTRL],
        [KBD_KEY_C],
        [KBD_KEY_C, true],
        [KBD_KEY_CTRL, true]
    ]
    const inputs = makeInputs(keyCodes)
    console.log(inputs)
    try {
        var sent = Winhook.SendInput.apply(Winhook, inputs)
    } catch(ex) {
        return false;
    }
    if (sent === -1) {
        return false;
    }
    if (sent != inputs.length) {
        return false;
    }
    return true;
}

/**
 * Shorthand method to convert a list of input scancodes to
 * instances of `winhook.Input`'s
 *
 * @param {Array} inputs
 */
const makeInputs = inputs => inputs.map(x => makeInput(x[0], x[1]));

/**
 * Return a new instance of `winhook.Input` for the given scancode
 *
 * @param {Number} virtualKeyCode integer (0-255)
 * @param {Boolean} isKeyUp true for key released, false for pressed
 */
const makeInput = (virtualKeyCode, isKeyUp) => {
    var input = new Input();
    input.type = Winhook.INPUT_KEYBOARD;
    var payload = { wVk: virtualKeyCode };
    if (isKeyUp) payload.dwFlags = Input.KEYEVENTF_KEYUP;
    input.ki = payload;
    return input;
}

module.exports = {
    isWindowActive,
    setWindowActive,
    sendCtrlC
}