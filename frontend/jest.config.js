module.exports = {
  reporters: [
    "default",
    ["jest-html-reporter", {
      outputPath: "test-report.html",
      pageTitle: "Test Report"
    }]
  ]
};