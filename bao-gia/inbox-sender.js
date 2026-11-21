// v2.1.9 sender adapter. Loaded after legacy sender and replaces popup transport.
// Set window.TG_QUOTE_INBOX_API to a verified Worker HTTPS URL in deployment config.
(async()=>{
 const api=window.TG_QUOTE_INBOX_API;
 if(!api)return; // No backend: preserve existing transfer and never report a false success.
 const {createQuoteInbox}=await import('../quote-inbox/client.js');
 const inbox=createQuoteInbox(api);
 let busy=false;
 window.startDirectTransfer=async function(){
  if(busy)return directSendStatus('Đang gửi báo giá, vui lòng chờ.');
  if(!navigator.onLine)return directSendStatus('Không có Internet. Chưa chuyển báo giá; hãy thử lại khi có mạng.',true);
  busy=true;
  try{
   const payload=await stableDebtTransfer();
   if(!inbox.authenticated){
    const password=prompt('Xác thực thiết bị lần đầu để sử dụng Hộp thư báo giá:');
    if(!password)return directSendStatus('Chưa xác thực thiết bị. Báo giá chưa được gửi.');
    await inbox.login(password);
   }
   directSendStatus('Đang lưu báo giá vào hộp thư...');
   const result=await inbox.send(payload);
   directSendStatus(result.duplicate?'Báo giá này đã có trong hộp thư. Không tạo bản trùng.':'Đã chuyển thành công. Mở Công Nợ để xử lý báo giá chờ.');
  }catch(err){directSendStatus('Chưa chuyển thành công: '+err.message,true);}
  finally{busy=false;}
 };
})();
