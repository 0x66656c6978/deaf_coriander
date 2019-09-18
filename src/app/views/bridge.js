/**
 * This is the bridge between the electron application and the views.
 * It defines an API for views to interact with each other or with the electron app
 */
import { remote } from 'electron'
import BuiltinModule from 'module'
import path from 'path'

const { clipboard, globalShortcut } = remote;

const addGlobalRequirePaths = () => {
    const Module = module.constructor.length > 1 ? module.constructor : BuiltinModule
    const _resolveFilename = Module._resolveFilename;
    Module._resolveFilename = (request, parentModule, isMain, options) => _resolveFilename(
        request === 'bridge'
            ? path.join(viewPath, 'bridge')
            : request.startsWith('lib/')
                ? path.join(__dirname, '..', request)
                : request,
        parentModule,
        isMain,
        options
    )
}
addGlobalRequirePaths()


export const views = remote.getGlobal('views')
export const remoteLog = remote.getGlobal('remoteLog')
export const quitApp = remote.getGlobal('quitApp')
remote.getGlobal('onQuit')(() => window.dispatchEvent(new Event('deaf_coriander-close')))

const defaultShortcuts = {
    pricecheckItem: '6'
}

export const globalShortcuts = {
    pricecheckItem: localStorage.getItem('shortcuts.pricecheckItem') || defaultShortcuts.pricecheckItem
}

export const positionViewAtMouse = (viewName) => {
    const mousePos = remote.screen.getCursorScreenPoint()
    views[viewName].show()
    views[viewName].setBounds({ x: mousePos.x, y: mousePos.y })
}

export const addShortcut = (accelerator, callback) => globalShortcut.register(accelerator, callback)
export const removeShortcut = (accelerator, callback) => globalShortcut.unregister(accelerator, callback)

export const readClipboard = () => clipboard.readText()

export const closeView = viewName => views[viewName].close()

window.addEventListener('DOMContentLoaded', () => window.dispatchEvent(new Event('deaf_coriander-load')))

window.bridge = {
    require,
    views,
    remoteLog,
    globalShortcuts,
    positionViewAtMouse,
    addShortcut,
    removeShortcut,
    readClipboard,
    closeView
}