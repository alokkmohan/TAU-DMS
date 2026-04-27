function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('src/ui/Index')
    .setTitle(CONFIG.SYSTEM_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
