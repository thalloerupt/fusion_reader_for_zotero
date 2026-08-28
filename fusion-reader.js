FusionReader = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	serverURL: "http://127.0.0.1:23120/open",

	init({ id, version, rootURI }) {
		if (this.initialized) return;
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;
	},

	log(message) {
		Zotero.debug(`Fusion Reader: ${message}`);
	},

	addToWindow(window) {
		const doc = window.document;
		if (doc.getElementById("fusion-reader-toolbar-button")) return;

		const toolbar = doc.getElementById("zotero-items-toolbar");
		if (toolbar) {
			const button = doc.createXULElement("toolbarbutton");
			button.id = "fusion-reader-toolbar-button";
			button.setAttribute("class", "zotero-tb-button");
			button.setAttribute("tabindex", "-1");
			button.setAttribute("label", "Fusion Reader");
			button.setAttribute("tooltiptext", "在 Fusion Reader 中打开选中的 PDF");
			button.setAttribute("image", this.rootURI + "icons/icon.svg");
			button.addEventListener("command", () => this.openSelected(window));
			toolbar.appendChild(button);
		}

		const itemMenu = doc.getElementById("zotero-itemmenu");
		if (itemMenu) {
			const menuitem = doc.createXULElement("menuitem");
			menuitem.id = "fusion-reader-item-menu";
			menuitem.setAttribute("label", "在 Fusion Reader 中打开");
			menuitem.setAttribute("image", this.rootURI + "icons/icon.svg");
			menuitem.setAttribute("class", "menuitem-iconic");
			menuitem.addEventListener("command", () => this.openSelected(window));
			itemMenu.appendChild(menuitem);
		}

		const toolsMenu = doc.getElementById("menu_ToolsPopup");
		if (toolsMenu) {
			const settings = doc.createXULElement("menuitem");
			settings.id = "fusion-reader-settings-menu";
			settings.setAttribute("label", "设置 Fusion Reader 程序路径…");
			settings.addEventListener("command", () => this.chooseExecutable(window));
			toolsMenu.appendChild(settings);
		}
	},

	addToAllWindows() {
		for (const window of Zotero.getMainWindows()) {
			if (window.ZoteroPane) this.addToWindow(window);
		}
	},

	removeFromWindow(window) {
		const doc = window.document;
		for (const id of [
			"fusion-reader-toolbar-button",
			"fusion-reader-item-menu",
			"fusion-reader-settings-menu",
		]) {
			doc.getElementById(id)?.remove();
		}
	},

	removeFromAllWindows() {
		for (const window of Zotero.getMainWindows()) {
			this.removeFromWindow(window);
		}
	},

	async openSelected(window) {
		try {
			const selectedItems = window.ZoteroPane.getSelectedItems();
			const attachment = await this.findPdfAttachment(selectedItems);
			if (!attachment) {
				this.alert(window, "Fusion Reader", "请先选择一个带有本地 PDF 附件的条目。");
				return;
			}

			const pdfPath = await attachment.getFilePathAsync();
			if (!pdfPath) {
				this.alert(window, "Fusion Reader", "所选 PDF 尚未下载到本机。");
				return;
			}

			if (await this.sendOpenRequest(pdfPath)) return;

			let executablePath = this.getExecutablePath();
			if (!executablePath) {
				executablePath = await this.chooseExecutable(window);
			}
			if (!executablePath) return;

			this.launch(executablePath);
			for (let attempt = 0; attempt < 40; attempt++) {
				await new Promise((resolve) => window.setTimeout(resolve, 250));
				if (await this.sendOpenRequest(pdfPath)) return;
			}
			throw new Error("Fusion Reader 已启动，但本机 HTTP 服务未响应。");
		} catch (error) {
			this.log(error?.stack || error);
			this.alert(window, "Fusion Reader", `无法打开 PDF：${error.message || error}`);
		}
	},

	async findPdfAttachment(items) {
		for (const item of items) {
			if (this.isPdfAttachment(item)) return item;
			if (!item.isRegularItem?.()) continue;

			const attachmentIDs = item.getAttachments?.() || [];
			const attachments = await Zotero.Items.getAsync(attachmentIDs);
			for (const attachment of attachments) {
				if (this.isPdfAttachment(attachment)) return attachment;
			}
		}
		return null;
	},

	isPdfAttachment(item) {
		if (!item?.isAttachment?.()) return false;
		const contentType = (item.attachmentContentType || "").toLowerCase();
		const filename = (item.attachmentFilename || "").toLowerCase();
		return contentType === "application/pdf" || filename.endsWith(".pdf");
	},

	async sendOpenRequest(pdfPath) {
		try {
			const response = await Zotero.HTTP.request("POST", this.serverURL, {
				body: JSON.stringify({ path: pdfPath }),
				headers: { "Content-Type": "application/json" },
				timeout: 500,
				errorDelayMax: 0,
			});
			return response.status === 200;
		} catch (error) {
			return false;
		}
	},

	getExecutablePath() {
		const saved = Zotero.Prefs.get("extensions.fusion-reader.executablePath", true);
		if (saved && this.fileExists(saved)) return saved;

		for (const candidate of this.defaultExecutablePaths()) {
			if (this.fileExists(candidate)) return candidate;
		}
		return null;
	},

	defaultExecutablePaths() {
		const paths = [];
		const env = Services.env;
		if (Zotero.isWin) {
			for (const base of [env.get("LOCALAPPDATA"), env.get("ProgramFiles")]) {
				if (base) paths.push(`${base}\\Fusion Reader\\fusion_reader.exe`);
				if (base) paths.push(`${base}\\Programs\\Fusion Reader\\fusion_reader.exe`);
			}
		} else if (Zotero.isMac) {
			paths.push("/Applications/Fusion Reader.app/Contents/MacOS/fusion_reader");
		} else {
			paths.push("/usr/bin/fusion_reader", "/usr/local/bin/fusion_reader");
			const home = Services.dirsvc.get("Home", Ci.nsIFile).path;
			paths.push(`${home}/.local/bin/fusion_reader`);
		}
		return paths;
	},

	fileExists(path) {
		try {
			const file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
			file.initWithPath(path);
			return file.exists() && file.isFile();
		} catch (_) {
			return false;
		}
	},

	async chooseExecutable(window) {
		const picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		picker.init(window, "选择 Fusion Reader 程序", Ci.nsIFilePicker.modeOpen);
		picker.appendFilters(Ci.nsIFilePicker.filterApps | Ci.nsIFilePicker.filterAll);
		const result = await new Promise((resolve) => picker.open(resolve));
		if (result !== Ci.nsIFilePicker.returnOK || !picker.file) return null;

		let path = picker.file.path;
		if (Zotero.isMac && path.toLowerCase().endsWith(".app")) {
			path += "/Contents/MacOS/fusion_reader";
		}
		if (!this.fileExists(path)) {
			this.alert(window, "Fusion Reader", "所选程序无效，请选择 Fusion Reader 可执行文件。");
			return null;
		}
		Zotero.Prefs.set("extensions.fusion-reader.executablePath", path, true);
		return path;
	},

	launch(executablePath) {
		const executable = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		executable.initWithPath(executablePath);
		if (!executable.exists()) throw new Error("Fusion Reader 程序不存在，请重新设置路径。");

		const process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
		process.init(executable);
		process.runwAsync([], 0, {
			observe: (_subject, topic) => {
				if (topic !== "process-finished") {
					this.log(`process ended with status: ${topic}`);
				}
			},
		}, false);
	},

	alert(window, title, message) {
		Services.prompt.alert(window, title, message);
	},
};
