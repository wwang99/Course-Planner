// Code from: https://ourcodeworld.com/articles/read/405/how-to-convert-pdf-to-text-extract-text-from-pdf-with-javascript

// Path to PDF file
var PDF_URL = 'transcript.pdf';

// Specify the path to the worker
PDFJS.workerSrc = '/resources/js/pdf.worker.js';

PDFJS.getDocument(PDF_URL).then(function (pdf) {

    var pdfDocument = pdf;
    // Create an array that will contain our promises 
    var pagesPromises = [];

    for (var i = 0; i < pdf.pdfInfo.numPages; i++) {
        // Required to prevent that i is always the total of pages
        (function (pageNumber) {
            // Store the promise of getPageText that returns the text of a page
            pagesPromises.push(getPageText(pageNumber, pdfDocument));
        })(i + 1);
    }

    // Execute all the promises
    Promise.all(pagesPromises).then(function (pagesText) {

        // Display text of all the pages in the console
        // e.g ["Text content page 1", "Text content page 2", "Text content page 3" ... ]
        console.log('hellol');
        console.log(pagesText);
        console.log('world');
        	// Remove loading
        $("#loading").remove();
        console.log(pagesText[0]);
        page1 = pagesText[0].toUpperCase();
        let ex = pagesText[0].indexOf('EXTERNAL EXAMINATIONS');
        console.log(ex);
        let tr = pagesText[0].indexOf('TRANSFER COURSES');
        console.log(tr);
        let external = pagesText[0].slice(ex,tr);
        console.log(external);
        const courseNumRE = /[0-9][0-9]\s\s[0-9][0-9][0-9]\s\s[0-9][0-9][0-9]/gi;
        console.log(JSON.stringify(external.match(courseNumRE)));
//        // Render text
//        for(var i = 0;i < pagesText.length;i++){
//        	$("#pdf-text").append("<div><h3>Page "+ (i + 1) +"</h3><p>"+pagesText[i]+"</p><br></div>")
//        }
    });

}, function (reason) {
    // PDF loading error
    console.error(reason);
});

/**
 * Retrieves the text of a specif page within a PDF Document obtained through pdf.js 
 * 
 * @param {Integer} pageNum Specifies the number of the page 
 * @param {PDFDocument} PDFDocumentInstance The PDF document obtained 
 **/
function getPageText(pageNum, PDFDocumentInstance) {
    // Return a Promise that is solved once the text of the page is retrieven
    return new Promise(function (resolve, reject) {
        PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
            // The main trick to obtain the text of the PDF page, use the getTextContent method
            pdfPage.getTextContent().then(function (textContent) {
                var textItems = textContent.items;
                var finalString = "";

                // Concatenate the string of the item to the final string
                for (var i = 0; i < textItems.length; i++) {
                    var item = textItems[i];

                    finalString += item.str + " ";
                }

                // Solve promise with the text retrieven from the page
                resolve(finalString);
            });
        });
    });
}

// Turn on Bootstrap tooltips
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
});