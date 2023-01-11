
exports.generateInvoice = (invoice) => {
  return `<html>
  <head> </head>
  <style>
  table, th, td {
  border: 1px solid white;
  border-collapse: collapse;
}
th, td {
  background-color: #94e0a6;
}

</style>
  <body>
    <h3 style="text-align: center">Invoice</h3>
    <div style="margin-left: 10%">
    
      <p>
        This is a confirmation of your successfull Job Creation on the butler
        platform.
      </p>
      <p>Below is your invoice break down for Job "${invoice.title}"</p>
      </br>
      
      <table>
        <tr>
          <td>Job:</td>
           <td>${invoice.title}</td>
        </tr>
        <tr>
          <td>Amount Payable:</td>
          <td>${invoice.amountPayable}</td>
        </tr>
        <tr>
          <td>Invoice Date:</td>
          <td>${new Date(invoice.invoiceDate).toDateString()}</td>
        </tr>
        <tr>
          <td>Due Date:</td>
          <td>${new Date(invoice.dueDate).toDateString()}</td>
        </tr>
      </table> 
      
      </br>
      <table>
        <tr>
          <td>Regards</td>
        </tr>
        <tr>
          <td>Team Butler</td>
        </tr>
      </table>
    </div>
  </body>
  </html>`
}
