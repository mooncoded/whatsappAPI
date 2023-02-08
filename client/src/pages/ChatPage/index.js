import React, { useEffect, useRef, useState } from "react";
import {
  ContactPfp,
  ContactRow,
  ContactName,
  Container,
  ChatMain,
  ChatInputContainer,
  ChatInput,
  ContactTopBar,
  MessageContainer,
  Chat,
  Sentinel,
  MessageBtn,
  SendFileInput,
  ClipIcon,
  DocumentContainer,
  QuotedMessageContainer,
  NormalMessage,
  Quoted,
  SendImageContainer,
  ImageOptions,
  CloseBtn,
  Image,
  SendOptions,
  Caption,
  EmojiSelectorMenu,
  ContactsList,
  Menu,
  VideoContainer,
  DocumentViewer,
  EmojiMenu,
  ImageMessage,
  ImagePreview,
  PreviewBackground,
  AudioMessage,
} from "./styles";
import EmojiPicker from "emoji-picker-react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  FloatingMenu,
  MainButton,
  ChildButton,
} from "react-floating-button-menu";
import { useParams, useNavigate } from "react-router";
import { io } from "socket.io-client";
import defaultPic from "../../assets/defaultPic.jpg";
import { convertToDate } from "../../utils/conversions";
import {
  getContacts,
  getCurrentChat,
  getMessages,
  sendMessage,
  uploadFile,
  sendImage,
  sendDoc,
  sendVid,
  sendAudio,
} from "../../services/api";
import {
  BsImage,
  IoDocument,
  BsCameraVideoFill,
  HiDownload,
  BsFillPlayFill,
  BsFillPauseFill,
} from "../../styles/Icons";
import AudioPlayer from "react-h5-audio-player";
import {RHAP_UI} from "react-h5-audio-player"
import "./styles.css";
import { BsPlay } from "react-icons/bs";

function ChatPage() {
  const [contacts, setContacts] = useState([]); // estado que guarda os contatos do usuário
  const [message, setMessage] = useState(""); // estado que guarda o valor do input do usuário
  const [chatMsgs, setChatMsgs] = useState([]); // estado que guarda o histórico de mensagens com o contato selecionado
  const [currentPage, setCurrentPage] = useState(-20);
  const [isOpen, setIsOpen] = useState(false);
  const [newMessageFlag, setNewMessageFlag] = useState(false);
  const [floatMenuOpen, setFloatMenuOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [file, setFile] = useState();
  const [caption, setCaption] = useState("");
  const [emojiMenuIsOpen, setEmojiMenuOpen] = useState(false);
  const fileinput = useRef(null); // hook auxiliar para o scroll do chat
  const [selectedContact, setSelectedContact] = useState({
    chatId: "",
    contactId: "",
    contactPfp: "",
    contactName: "",
  }); // estado que guarda as informações do contato selecionado
  const { userIns, chatId } = useParams(); // usa o hook useParams do react-router para pegar os parametros passados através da URL (instância do usuário e o ID do chat selecionado)
  const navigate = useNavigate();
  const scrollRef = useRef();

  useEffect(() => {
    // hook chamado para pegar as mensagens do contato selecionado e grava-las no state chatMsgs
    const getMessageDetails = async () => {
      let data = await handleGetMsgs();
      if (data.lenght > 20) {
        setChatMsgs(data.slice(1).slice(currentPage));
      } else {
        setChatMsgs(data);
      }
    };
    getMessageDetails();
  }, [selectedContact, chatId, newMessageFlag, currentPage]); // o hook é disparado toda vez que o usuário seleciona um chat ou uma mensagem é enviada ou recebida

  useEffect(() => {
    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setCurrentPage((currentPageInsideState) => currentPageInsideState - 20);
      }
    });

    intersectionObserver.observe(document.querySelector(".sentinel"));

    return () => {
      intersectionObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ transition: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    // esse hook é disparado no primeiro load da página e serve para buscar a lista de contatos do usuário
    const getAllContacts = async () => {
      let data = await getContacts({
        user_token: localStorage.getItem("userToken"),
      });
      setContacts(data.data);
    };
    getAllContacts();
  }, []);

  useEffect(() => {
    let socket = io.connect("http://localhost:3001"); // socket de conexão com o back-end

    const saveReceiverMsg = async (importedData) => {
      // ao receber a mensagem vinda do socket
      let data = await getCurrentChat({
        from: importedData.to,
        to: importedData.from,
      });
      let chatId = data.data._id;

      // chama a função para salvar a mensagem no banco de dados
      handleSendMsg(
        chatId,
        importedData.from,
        importedData.to,
        importedData.type == "quotedText"
          ? {
              quotedMessage: importedData.quotedContent,
              message: importedData.content,
            }
          : importedData.content,
        importedData.type
      );

      setNewMessageFlag((prev) => !prev);
    };

    // hook que recebe as requisições de socket do servidor (os sockets mandam as mensagem recebidas pelo usuário)
    socket.on("message", saveReceiverMsg);

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSendMsg = async (chatId, from, to, text, type) => {
    // função usada para salvar as mensagens tanto do sender quanto do receiver
    let messageValue = {};

    if (file) {
      // se o usuário estiver enviando um arquivo
      messageValue = {
        chatId: chatId,
        from: from,
        to: to,
        text: fileUrl,
        caption: caption,
        type: "file",
      };
    } else {
      messageValue = {
        chatId: chatId,
        from: from,
        to: to,
        text: text,
        type: "text",
      };
    }

    switch (
      type // caso o tipo da mensagem do receiver
    ) {
      case "text": // for uma texto comum
        messageValue = {
          chatId: chatId,
          from: from,
          to: to,
          text: text,
          type: "text",
        };
        break;
      case "image": // for uma imagem
        messageValue = {
          chatId: chatId,
          from: from,
          to: to,
          text: text,
          type: "file",
        };
        break;
      case "quotedText":
        messageValue = {
          chatId: chatId,
          from: from,
          to: to,
          text: text.message,
          quotedMessage: text.quotedMessage,
          type: "quotedText",
        };
        break;
    }

    setFile();
    setFileUrl("");
    setMessage("");

    await sendMessage(messageValue); // salve a mensagem

    setNewMessageFlag((prev) => !prev);
  };

  const handleGetChat = async (number, pfp, name) => {
    // essa função serve para buscar as informações do chat selecionado
    let data = await getCurrentChat({ from: userIns, to: number });

    navigate(`/${userIns}/live-chat/${data.data._id}`);
    setSelectedContact({
      chatId: data.data._id,
      contactId: number,
      contactPfp: pfp,
      contactName: name,
    });
    setCurrentPage(-10);
    setFile();
    setIsOpen(false);
  };

  async function handleGetMsgs() {
    // função usada para buscar o histórico de mensagens do usuário com um determinado contato
    let data = await getMessages({ chatId: chatId });

    return data.data;
  }

  useEffect(() => {
    // toda vez que o estado file mudar, salva a imagem no banco de dados
    const getImage = async () => {
      if (file) {
        const data = new FormData();
        data.append("name", file.name);
        data.append("file", file);

        let response = await uploadFile(data);
        setFileUrl(response.data);
      }
    };
    getImage();
  }, [file]);

  const handleFileMessage = async () => {
    const data = new FormData();
    data.append("file", file);
    data.append("id", selectedContact.contactId);
    data.append("caption", caption);

    switch (file.type.split("/")[0]) {
      case "image":
        await sendImage({ from: userIns, data: data });
        break;
      case "application":
        await sendDoc({ from: userIns, data: data });
        break;
      case "video":
        await sendVid({ from: userIns, data: data });
        break;
      case "audio":
        await sendAudio({ from: userIns, data: data });
        break;
    }

    handleSendMsg(chatId, userIns, selectedContact.contactId, message, "file");

    setCaption("");
    setIsOpen(false);
    setNewMessageFlag((prev) => !prev);
  };

  const onFileChange = (e) => {
    // sempre que o usuário selecionar um novo arquivo, salva as caracteristicas do arquivo nos estados:
    setFile(e.target.files[0]);
    setFileUrl(e.target.files[0].name);

    setIsOpen(true);
  };

  const closeImagePreview = () => {
    setFile();
    setIsOpen(false);
  };

  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

  return (
    <Container>
      <ContactsList>
        {contacts.map((contact, index) => {
          return (
            <ContactRow
              key={index}
              onClick={() =>
                handleGetChat(contact.number, contact.pfp, contact.contact)
              }
              selected={
                selectedContact.contactId == contact.number ? "selected" : "not"
              }
            >
              <ContactPfp
                src={contact.pfp != null ? contact.pfp : defaultPic}
              />
              <ContactName>{contact.contact}</ContactName>
            </ContactRow>
          );
        })}
      </ContactsList>
      <ChatMain>
        <ContactTopBar>
          <ContactPfp
            src={
              selectedContact.contactPfp != null
                ? selectedContact.contactPfp
                : defaultPic
            }
          />
          <ContactName>{selectedContact.contactName}</ContactName>
        </ContactTopBar>
        {isOpen ? (
          <SendImageContainer>
            <ImageOptions>
              <CloseBtn onClick={() => closeImagePreview()}>X</CloseBtn>
            </ImageOptions>
            {file.type.includes("application") && (
              <DocumentViewer>
                <Document file={fileUrl}>
                  <Page
                    pageNumber={1}
                    width={400}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </Document>
              </DocumentViewer>
            )}
            {file.type.includes("image") && <Image src={fileUrl} />}
            {file.type.includes("video") && (
              <video controls>
                <source src={fileUrl} type="video/mp4" />
              </video>
            )}
            <SendOptions>
              <Caption
                type="text"
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Descrição da imagem.."
              />
              <MessageBtn
                className="file"
                size={30}
                onClick={() => handleFileMessage()}
              />
            </SendOptions>
          </SendImageContainer>
        ) : (
          <>
            <Chat ref={scrollRef}>
              <Sentinel className="sentinel"></Sentinel>
              {chatMsgs.map((msg, index) => {
                return (
                  <>
                    {userIns == msg.from ? (
                      <MessageContainer key={index}>
                        {msg.type == "quotedText" ? (
                          <QuotedMessageContainer>
                            <Quoted>
                              <b>Você</b>
                              <p>{msg.quotedMessage}</p>
                            </Quoted>
                            <p>{msg.text}</p>
                            <sub>{convertToDate(msg.date)}</sub>
                          </QuotedMessageContainer>
                        ) : (
                          <>
                            {msg.type === "file" ? (
                              <>
                                <FileMessage message={msg} />
                                <p>{msg.caption}</p>
                                <sub>{convertToDate(msg.date)}</sub>
                              </>
                            ) : (
                              <NormalMessage>
                                <p>{msg.text}</p>
                                <sub>{convertToDate(msg.date)}</sub>
                              </NormalMessage>
                            )}
                          </>
                        )}
                      </MessageContainer>
                    ) : (
                      <MessageContainer receiver key={index}>
                        {msg.type == "quotedText" ? (
                          <QuotedMessageContainer>
                            <Quoted>
                              <b>Você</b>
                              <p>{msg.quotedMessage}</p>
                            </Quoted>
                            <p>{msg.text}</p>
                            <sub>{convertToDate(msg.date)}</sub>
                          </QuotedMessageContainer>
                        ) : (
                          <>
                            {msg.type === "file" ? (
                              <>
                                <FileMessage message={msg} />
                                <p>{msg.caption}</p>
                              </>
                            ) : (
                              <NormalMessage receiver>
                                <p>{msg.text}</p>
                                <sub>{convertToDate(msg.date)}</sub>
                              </NormalMessage>
                            )}
                          </>
                        )}
                      </MessageContainer>
                    )}
                  </>
                );
              })}
            </Chat>
            <ChatInputContainer>
              {emojiMenuIsOpen && (
                <EmojiMenu>
                  <EmojiPicker />
                </EmojiMenu>
              )}
              <EmojiSelectorMenu
                size={30}
                onClick={() => setEmojiMenuOpen(!emojiMenuIsOpen)}
              />
              <Menu>
                <FloatingMenu
                  slideSpeed={500}
                  direction="up"
                  spacing={10}
                  isOpen={floatMenuOpen}
                >
                  <MainButton
                    iconResting={<ClipIcon size={30} />}
                    iconActive={<ClipIcon size={30} />}
                    onClick={() => setFloatMenuOpen(!floatMenuOpen)}
                    background="transparent"
                    style={{ boxShadow: "none" }}
                    size={30}
                  />
                  <ChildButton
                    icon={<BsImage size={20} color="#FFFFFF" />}
                    size={40}
                    background="#BF59CF"
                    onClick={() => fileinput.current.click()}
                    style={{ boxShadow: "none" }}
                  />
                  <ChildButton
                    icon={<BsCameraVideoFill size={20} color="#FFFFFF" />}
                    size={40}
                    background="#EC407A"
                    onClick={() => fileinput.current.click()}
                    style={{ boxShadow: "none" }}
                  />
                  <ChildButton
                    icon={<IoDocument size={20} color="#FFFFFF" />}
                    size={40}
                    background="#5F66CD"
                    onClick={() => fileinput.current.click()}
                    style={{ boxShadow: "none" }}
                  />
                </FloatingMenu>
              </Menu>
              <SendFileInput
                type="file"
                id="fileinput"
                ref={fileinput}
                onChange={(e) => onFileChange(e)}
              />
              <ChatInput
                type="text"
                placeholder="Mensagem"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <MessageBtn
                size={30}
                onClick={() =>
                  handleSendMsg(
                    selectedContact.chatId,
                    userIns,
                    selectedContact.contactId,
                    message
                  )
                }
              />
            </ChatInputContainer>
          </>
        )}
      </ChatMain>
    </Container>
  );
}

const FileMessage = ({ message }) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [fullImageView, setFullImageView] = useState(false);

  const handleDownloadFile = (url) => {
    window.open(`${url}`);
  };

  const openImageFullPreview = (e) => {
    setPreviewUrl(e != "" ? e : "");
    setFullImageView(!fullImageView);
  };

  return (
    <>
      {fullImageView && (
        <ImagePreview>
          <img src={previewUrl} />
          <PreviewBackground onClick={() => openImageFullPreview()} />
        </ImagePreview>
      )}
      {message?.text?.includes(".pdf") && (
        <DocumentContainer onClick={() => handleDownloadFile(message.text)}>
          <IoDocument size={30} fill="#F34646" />
          <p>{message.text.split("file-")[1]}</p>
          <HiDownload size={30} fill="#92AD9E" />
        </DocumentContainer>
      )}
      {message?.text?.includes(".mp4") && (
        <VideoContainer controls>
          <source src={message.text} type="video/mp4" />
          <sub>{convertToDate(message.date)}</sub>
        </VideoContainer>
      )}
      {message?.text?.includes(".mp3") && (
        <AudioMessage>
          <AudioPlayer
            src={message.text}
            style={{
              width: "300px",
              backgroundColor: "transparent",
              border: "none",
              boxShadow: "none",
              padding: "0",
              margin: "0",
              fontSize: "12px"
            }}        
            customProgressBarSection={
              [
                "DURATION",
                "PROGRESS_BAR",
              ]
            }
            customAdditionalControls={[]}
            customVolumeControls={[]}
            showSkipControls={false}
            showJumpControls={false}
            showFilledProgress={true}
            showFilledVolume={false}
            customIcons={{
              play: <BsFillPlayFill />,
              pause: <BsFillPauseFill />,
            }}
            layout="horizontal-reverse"
          />
        </AudioMessage>
      )}
      {message?.text?.includes(".png") ||
        (message?.text?.includes(".jpg") && (
          <ImageMessage
            src={message.text}
            alt={message.text}
            onClick={() => openImageFullPreview(message.text)}
          />
        ))}
    </>
  );
};

export default ChatPage;
