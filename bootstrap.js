var FusionReader;

function log(message) {
	Zotero.debug(`Fusion Reader: ${message}`);
}

function install() {
	log("installed");
}

async function startup({ id, version, rootURI }) {
	Services.scriptloader.loadSubScript(rootURI + "fusion-reader.js");
	FusionReader.init({ id, version, rootURI });
	FusionReader.addToAllWindows();
}

function onMainWindowLoad({ window }) {
	FusionReader?.addToWindow(window);
}

function onMainWindowUnload({ window }) {
	FusionReader?.removeFromWindow(window);
}

function shutdown() {
	FusionReader?.removeFromAllWindows();
	FusionReader = undefined;
}

function uninstall() {
	log("uninstalled");
}
