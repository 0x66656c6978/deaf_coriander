import path from 'path'
import BuiltinModule from "module"
import {
    app as electronApp,
    BrowserWindow,
    Menu,
    Tray 
} from 'electron'

export const viewPath = path.join(__dirname, '..', 'views')

export const views = {
    pricecheck: null
}
// TODO: dont pollute `global`
global.views = views
global.BuiltinModule = BuiltinModule
global.remoteLog = (...args) => console.log(...args)
global._onQuit = null
global.onQuit = callback => global._onQuit = callback
global.quitApp = () => {
    if (global._onQuit) global._onQuit()
    setTimeout(() => electronApp.quit(), 0) // run on next tick so event listeners can fire before
}

let started = false
let tray = null

export const addGlobalRequirePaths = () => {
    const Module = module.constructor.length > 1 ? module.constructor : BuiltinModule
    const _resolveFilename = Module._resolveFilename;
    Module._resolveFilename = (request, parentModule, isMain, options) => _resolveFilename(
        request === 'bridge'
            ? path.join(viewPath, 'bridge')
            : request.startsWith('lib/')
                ? path.join(__dirname, '..', request.substr(alias.length))
                : request,
        parentModule,
        isMain,
        options
    )
}

export const boot = () => {
    electronApp.disableHardwareAcceleration()
    electronApp.on('ready', start)
    electronApp.on('window-all-closed', () => (process.platform !== 'darwin') && electronApp.quit())
    electronApp.on('activate', () => !started && start())
}

const hybernate = () => {
    started = false
    for (let viewName in views)
        if (views[viewName]) views[viewName] = null
}

const createView = (viewName, browserWindowOptions = {}, startMinimized = true) => {
    const view = views[viewName] = new BrowserWindow({
        width: 400,
        height: 250,
        // frame: false,
        ...browserWindowOptions,
        webPreferences: {
            preload: path.join(viewPath, 'bridge.js'),
            ...(browserWindowOptions.webPreferences || {}),
        },
    })
    if (startMinimized) view.hide()
    views[viewName].on('closed', () => {
        views[viewName] = null
        hybernate()
    })
    view.loadFile(path.join(viewPath, viewName, 'index.html'))
    return view
}

const start = () => {
    started = true
    tray = new Tray(path.join(__dirname, '..', 'icon.ico'))
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Options', type: 'normal', click() { views.options.show() } },
      { label: 'Quit', type: 'normal', click() { global.quitApp() }}
    ])
    tray.setToolTip('deaf_coriander')
    tray.setContextMenu(contextMenu)
    createView('pricecheck').openDevTools()
    createView('options')
}