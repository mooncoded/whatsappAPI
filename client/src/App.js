import React from "react";
import Main from "./pages/Main";
import GlobalStyle from "./styles/GlobalStyle";
import { ModalProvider } from "./modal.context";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserPanel from "./pages/UserPanel";
import ChatPage from "./pages/ChatPage";
import WhatsApp from "./components/Whatsapp";
import Fields from "./components/Fields";
import Tags from "./components/Tags";
import Responses from "./components/Responses";
import Admin from "./components/Admin";
import Welcome from "./components/Welcome";
import Company from "./components/Company";
import Logs from "./components/Logs";
import FieldsModal from "./components/FieldsModal";
import Flow from "./components/Flow";
import LoginPage from "./pages/LoginPage";

function App() {
  localStorage.setItem("userToken", "teste")

  return (
    <BrowserRouter>
      <ModalProvider>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route exact path="/panel/:userIns" element={<UserPanel />} />
          <Route path="/:userIns/live-chat/:chatId?" element={<ChatPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/:userIns/settings" element={<WhatsApp/>}/>
          <Route path="/:userIns/settings/customFields" element={<Fields/>}/>
          <Route path="/:userIns/settings/tags" element={<Tags/>}/>
          <Route path="/:userIns/settings/fastReplies" element={<Responses/>}/>
          <Route path="/:userIns/settings/managers" element={<Admin/>}/>
          <Route path="/:userIns/settings/defaultValues" element={<Welcome/>}/>
          <Route path="/:userIns/settings/company" element={<Company/>}/>
          <Route path="/:userIns/settings/logs" element={<Logs/>}/>
          <Route path="/:userIns/constructor/:flowId" element={<Flow/>}/>
          <Route path="/teste" element={<FieldsModal/>}/>
        </Routes>
        <GlobalStyle />
      </ModalProvider>
    </BrowserRouter>
  );
}

export default App;
