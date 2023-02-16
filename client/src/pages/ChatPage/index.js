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
  AudioPreviewContainer,
  DownloadOverlay,
  SearchBox,
  SearchInput,
  ContactHeader,
  MyProfile,
  SearchContainer,
  Contacts,
  LastMessage,
  NewMessages,
} from "./styles";
import EmojiPicker from "emoji-picker-react";
import InputEmoji from "react-input-emoji";
import { Document, Page, pdfjs } from "react-pdf";
import {
  FloatingMenu,
  MainButton,
  ChildButton,
} from "react-floating-button-menu";
import { useParams, useNavigate } from "react-router";
import { io } from "socket.io-client";
import defaultPic from "../../assets/defaultPic.jpg";
import { FixedSizeList as List } from "react-window";
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
  getUserPicture,
  getInfo,
  getContactLastMessage,
} from "../../services/api";
import {
  BsImage,
  IoDocument,
  BsCameraVideoFill,
  HiDownload,
  BsFillPlayFill,
  BsFillPauseFill,
  BsFillFileEarmarkMusicFill,
  AiFillFileZip,
  BsCheckAll,
  BiSearchAlt,
} from "../../styles/Icons";
import AudioPlayer from "react-h5-audio-player";
import "./styles.css";

function ChatPage() {
  const [contacts, setContacts] = useState([]); // estado que guarda os contatos do usuário
  const [message, setMessage] = useState(""); // estado que guarda o valor do input do usuário
  const [chatMsgs, setChatMsgs] = useState([]); // estado que guarda o histórico de mensagens com o contato selecionado
  const [currentPage, setCurrentPage] = useState(-15);
  const [isOpen, setIsOpen] = useState(false);
  const [newMessageFlag, setNewMessageFlag] = useState(false);
  const [floatMenuOpen, setFloatMenuOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [file, setFile] = useState();
  const [acceptedFiles, setAcceptedFiles] = useState("");
  const [caption, setCaption] = useState("");
  const [emojiMenuIsOpen, setEmojiMenuOpen] = useState(false);
  const [userPictureUrl, setUserPicture] = useState("");
  const [contactsMessages, setContactsMessages] = useState([
    { contact: "", message: "", unreadMessages: 0 },
  ]);
  const [searchBox, setSearchBox] = useState("");
  const [insInfo, setInsInfo] = useState({ username: "", userId: "" });
  const fileinput = useRef(null); // hook auxiliar para o scroll do chat
  const [selectedContact, setSelectedContact] = useState({
    chatId: "main",
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
      if (data.length > 20) {
        setChatMsgs(data.slice(1).slice(currentPage));
      } else {
        setChatMsgs(data);
      }
      setChatMsgs(data);
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
    let socket = io.connect(process.env.REACT_APP_URL); // socket de conexão com o back-end

    const saveReceiverMsg = async () => {
      // ao receber a mensagem vinda do socket
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

    setFile();
    setFileUrl("");
    setMessage("");

    await sendMessage(messageValue); // salve a mensagem

    setNewMessageFlag((prev) => !prev);
  };

  const handleGetChat = async (number, pfp, name) => {
    // essa função serve para buscar as informações do chat selecionado
    if (userIns != null && number != "") {
      let data = await getCurrentChat({ from: userIns, to: number });

      navigate(`/${userIns}/live-chat/${data.data._id}`);
      setSelectedContact({
        chatId: data.data._id,
        contactId: number,
        contactPfp: pfp,
        contactName: name,
      });
      setCurrentPage(-15);
      setFile();
      setAcceptedFiles("");
      setIsOpen(false);

      let targetIndex = contactsMessages.findIndex(
        (index) => index.contact == number
      );

      if (targetIndex != -1) {
        // sobrescreve os valores com a nova mensagem recebida
        let temporaryarray = contactsMessages.slice();
        temporaryarray[targetIndex].unreadMessages = 0;
        setContactsMessages(temporaryarray);
      }
    }
  };

  async function handleGetMsgs() {
    // função usada para buscar o histórico de mensagens do usuário com um determinado contato
    if (chatId != null) {
      let data = await getMessages({ chatId: chatId });

      return data.data;
    }
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
    // envia mensagens de documentos/imagens, audios, documentos em geral
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
    // fecha o preview de imagens
    setFile();
    setIsOpen(false);
  };

  useEffect(() => {
    // abre o seletor de arquivos
    const openSelector = async () => {
      if (acceptedFiles) {
        await fileinput.current.click();
      }
    };
    openSelector();
    setAcceptedFiles("");
  }, [acceptedFiles]);

  const handleEnter = (text) => {
    // função que envia a mensagem digitada pelo usuário caso ele aperte ENTER
    handleSendMsg(chatId, userIns, selectedContact.contactId, text);
  };

  const AlwaysScrollToBottom = () => {
    const elementRef = useRef();
    useEffect(() => elementRef.current.scrollIntoView());
    return <div ref={elementRef} />;
  };

  useEffect(() => {
    // pega o nome e o telefone do usuário
    const getUserInfo = async () => {
      let data = await getInfo({ key: userIns });
      setInsInfo({
        username: data.data.instance_data.user.name,
        userId: data.data.instance_data.user.id.split(":")[0],
      });
    };
    getUserInfo();
  }, []);

  useEffect(() => {
    // hook que busca a foto de perfil do usuário da aplicação
    const userPicture = async () => {
      if (insInfo.userId != "") {
        let data = await getUserPicture({ key: userIns, id: insInfo.userId });
        setUserPicture(data.data);
      }
    };
    userPicture();
  }, [insInfo]);

  useEffect(() => {
    const getLast = () => {
      contacts?.map(async (contact) => {
        if (contact != null) {
          let data = await getContactLastMessage({
            from: userIns,
            to: contact.number,
          }); // retorna a ultima mensagem que o contato enviou, este código é executado para todos os contatos da lista

          if (data.data.lastMessage != null) {
            // se os dados não forem vazios
            if (
              !contactsMessages.some(
                (number) => number.contact == contact.number
              ) // se o numéro do contato não está no state de ultimas mensagens
            ) {
              setContactsMessages((contactsMessages) => [
                // salva a ultima mensagem do contato na lista
                ...contactsMessages,
                {
                  contact: contact.number,
                  message: data.data.lastMessage.text,
                  unreadMessages: data.data.unreadMessagesCount,
                },
              ]);
            } else {
              // caso o contato já esteja
              let targetIndex = contactsMessages.findIndex(
                (number) => number.contact == contact.number
              );

              if (targetIndex != -1) {
                // sobrescreve os valores com a nova mensagem recebida
                let temporaryarray = contactsMessages.slice();
                temporaryarray[targetIndex].message =
                  data.data.lastMessage.text;
                temporaryarray[targetIndex].unreadMessages =
                  data.data.unreadMessagesCount;
                setContactsMessages(temporaryarray);
              }
            }
          }
        }
      });
    };
    getLast();
  }, [contacts, newMessageFlag]); // esse hook é disparado sempre que o usuário recebe uma nova mensagem ou a lista de contatos é atualizada.

  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

  return (
    <Container>
      <ContactsList>
        <ContactHeader>
          <MyProfile>
            <ContactPfp
              src={userPictureUrl}
              onError={({ currentTarget }) => {
                currentTarget.onerror = null;
                currentTarget.src = defaultPic;
              }}
            />
          </MyProfile>
          <SearchContainer>
            <SearchBox>
              <BiSearchAlt />
              <SearchInput
                onChange={(e) => setSearchBox(e.target.value)}
                placeholder="Pesquisar uma conversa..."
                type="text"
              />
            </SearchBox>
            <hr style={{ marginBottom: "0" }} />
          </SearchContainer>
        </ContactHeader>
        <Contacts>
          {contacts
            ?.filter((contact) =>
              contact.contact?.toLowerCase().includes(searchBox?.toLowerCase())
            )
            .map((contact, index) => {
              var result = contactsMessages.filter((obj) => {
                return obj.contact == contact.number;
              });

              return (
                <ContactRow
                  key={index}
                  onClick={() =>
                    handleGetChat(contact.number, contact.pfp, contact.contact)
                  }
                  selected={
                    selectedContact.contactId == contact.number
                      ? "selected"
                      : "not"
                  }
                >
                  <ContactPfp
                    src={contact.pfp != null ? contact.pfp : defaultPic}
                    onError={({ currentTarget }) => {
                      currentTarget.onerror = null;
                      currentTarget.src = defaultPic;
                    }}
                  />
                  <ContactName>
                    <p>{contact.contact}</p>
                    {result != [] ? (
                      <small>{result[0]?.message}</small>
                    ) : (
                      console.log("equal")
                    )}
                  </ContactName>
                  {result[0]?.unreadMessages > 0 ? (
                    <NewMessages>{result[0]?.unreadMessages}</NewMessages>
                  ) : (
                    <></>
                  )}
                </ContactRow>
              );
            })}
        </Contacts>
      </ContactsList>
      <ChatMain>
        <ContactTopBar>
          <ContactPfp
            src={
              selectedContact.contactPfp != null
                ? selectedContact.contactPfp
                : defaultPic
            }
            onError={({ currentTarget }) => {
              currentTarget.onerror = null;
              currentTarget.src = defaultPic;
            }}
          />
          <ContactName>{selectedContact.contactName}</ContactName>
        </ContactTopBar>
        {isOpen ? (
          <SendImageContainer>
            <ImageOptions>
              <CloseBtn onClick={() => closeImagePreview()}>X</CloseBtn>
            </ImageOptions>
            {file.type.includes("pdf") && (
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
            {!file.type.includes("pdf") &&
              file.type.includes("application") && (
                <AudioPreviewContainer>
                  <AiFillFileZip />
                  <h3>Pré-visualização indisponivel.</h3>
                </AudioPreviewContainer>
              )}
            {file.type.includes("image") && <Image src={fileUrl} />}
            {file.type.includes("video") && (
              <video controls>
                <source src={fileUrl} type="video/mp4" />
              </video>
            )}
            {file.type.includes("audio") && (
              <AudioPreviewContainer>
                <BsFillFileEarmarkMusicFill />
                <h3>Pré-visualização indisponivel.</h3>
              </AudioPreviewContainer>
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

              {chatMsgs.slice(currentPage).map((msg, index) => {
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
                            <sub>
                              {convertToDate(msg.date)}
                              <BsCheckAll size={15} />
                            </sub>
                          </QuotedMessageContainer>
                        ) : (
                          <>
                            {msg.type === "file" ? (
                              <>
                                <FileMessage
                                  message={{ msg: msg, pfp: userPictureUrl }}
                                />
                                <p>{msg.caption}</p>
                                <sub>
                                  {convertToDate(msg.date)}
                                  <BsCheckAll size={15} />
                                </sub>
                              </>
                            ) : (
                              <NormalMessage>
                                <p>{msg.text}</p>
                                <sub>
                                  {convertToDate(msg.date)}
                                  <BsCheckAll size={15} />
                                </sub>
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
                                <FileMessage
                                receiver
                                  message={{
                                    msg: msg,
                                    pfp: selectedContact.contactPfp,
                                  }}
                                />
                                <p>{msg.caption}</p>
                              </>
                            ) : (
                              <NormalMessage receiver>
                                <p>{msg.text}</p>
                                <sub>{convertToDate(msg.date)} </sub>
                              </NormalMessage>
                            )}
                          </>
                        )}
                      </MessageContainer>
                    )}
                  </>
                );
              })}
              <AlwaysScrollToBottom />
            </Chat>
            <ChatInputContainer>
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
                    onClick={() => setAcceptedFiles(".jpg, .jpeg, .png")}
                    style={{ boxShadow: "none" }}
                  />
                  <ChildButton
                    icon={<BsCameraVideoFill size={20} color="#FFFFFF" />}
                    size={40}
                    background="#EC407A"
                    onClick={() => setAcceptedFiles(".mp4, .mov")}
                    style={{ boxShadow: "none" }}
                  />
                  <ChildButton
                    icon={<IoDocument size={20} color="#FFFFFF" />}
                    size={40}
                    background="#5F66CD"
                    onClick={() =>
                      setAcceptedFiles(".pdf, .doc, .zip, .rar, .mp3, .wav")
                    }
                    style={{ boxShadow: "none" }}
                  />
                </FloatingMenu>
              </Menu>
              <SendFileInput
                type="file"
                id="fileinput"
                accept={acceptedFiles}
                ref={fileinput}
                onChange={(e) => onFileChange(e)}
              />
              <InputEmoji
                value={message}
                onChange={setMessage}
                onEnter={handleEnter}
                cleanOnEnter
                borderRadius={12}
                theme="light"
                placeholder="Digite uma mensagem.."
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

const FileMessage = ({ receiver, message }) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [fullImageView, setFullImageView] = useState(false);

  const handleDownloadFile = (url) => {
    window.open(`${url}`);
  };

  const openImageFullPreview = (e) => {
    setPreviewUrl(e != "" ? e : "");
    setFullImageView(!fullImageView);
  };

  function download(dataurl, filename) {
    const link = document.createElement("a");
    link.href = dataurl;
    link.download = filename;
    link.click();
  }

  return (
    <>
      <DownloadOverlay onClick={() => download(message.msg.text, "jooj")} />
      {fullImageView && (
        <ImagePreview>
          <img src={previewUrl} />
          <PreviewBackground onClick={() => openImageFullPreview()} />
        </ImagePreview>
      )}
      {[".pdf", ".doc", ".rar", ".zip"].some((el) =>
        message.msg?.text?.includes(el)
      ) && (
        <DocumentContainer onClick={() => handleDownloadFile(message.msg.text)}>
          <IoDocument size={30} fill="#F34646" />
          <p>{message.msg.text.split("file-")[1]}</p>
          <HiDownload size={30} fill="#92AD9E" />
        </DocumentContainer>
      )}
      {[".mp4", ".mov"].some((el) => message.msg?.text?.includes(el)) && (
        <VideoContainer controls>
          <source src={message.msg.text} type="video/mp4" />
          <sub>{convertToDate(message.msg.date)}</sub>
        </VideoContainer>
      )}
      {[".mp3", ".wav"].some((el) => message.msg?.text?.includes(el)) && (
        <AudioMessage>
          <ContactPfp src={message.pfp} />
          <AudioPlayer
            src={message.msg.text}
            style={{
              width: "300px",
              backgroundColor: "transparent",
              border: "none",
              boxShadow: "none",
              padding: "0",
              margin: "0",
              fontSize: "12px",
            }}
            customProgressBarSection={["DURATION", "PROGRESS_BAR"]}
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
      {[".png", ".jpg", ".jpeg"].some((el) =>
        message.msg?.text?.includes(el)
      ) && (
        <ImageMessage
          src={receiver ? `${process.env.REACT_APP_URL}/${message.msg.text}` : message.msg.text}
          alt={message.msg.text}
          onClick={() => openImageFullPreview(message.msg.text)}
        />
      )}
    </>
  );
};

export default ChatPage;
