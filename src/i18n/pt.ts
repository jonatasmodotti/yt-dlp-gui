import type { Translations } from "./en";

/** Portuguese translation dictionary. */
export const pt: Translations = {
  // Header
  "header.tagline": "Baixe vídeos, áudios e transcrições",
  "header.settings": "Configurações",

  // Engine banner
  "engineBanner.ytdlpNotFound":
    "O yt-dlp não foi encontrado, então os downloads não podem iniciar.",
  "engineBanner.ytdlpNotRunnable":
    "O yt-dlp não pôde ser executado, então os downloads não podem iniciar.",
  "engineBanner.ffmpegNotFound":
    "O ffmpeg não foi encontrado. Mesclagem, extração de áudio e incorporação não funcionarão.",
  "engineBanner.ffmpegNotRunnable":
    "O ffmpeg não pôde ser executado. Mesclagem, extração de áudio e incorporação não funcionarão.",
  "engineBanner.setUp": "Configurar",

  // URL bar
  "urlBar.placeholder": "Cole o link de um vídeo ou playlist…",
  "urlBar.ariaLabel": "URL do vídeo ou playlist",
  "urlBar.batchPlaceholder":
    "Cole os links, um por linha…\nhttps://www.youtube.com/watch?v=…\nhttps://youtu.be/…",
  "urlBar.batchAriaLabel": "Links para baixar, um por linha",
  "urlBar.pasteAriaLabel": "Colar da área de transferência",
  "urlBar.batch": "Lote",
  "urlBar.batchTitleSingle": "Voltar para um único link",
  "urlBar.batchTitleMultiple": "Baixar vários links (um por linha)",
  "urlBar.download": "Baixar",
  "urlBar.downloadCount": "Baixar {count}",
  "urlBar.noLinksYet": "Nenhum link ainda",
  "urlBar.batchCountOne": "1 link · usa as opções abaixo",
  "urlBar.batchCountOther": "{count} links · usa as opções abaixo",
  "urlBar.addedQueueOne": "1 link adicionado à fila.",
  "urlBar.addedQueueOther": "{count} links adicionados à fila.",
  "urlBar.clipboardError": "Não foi possível ler a área de transferência.",

  // Format card
  "format.title": "Formato",
  "format.downloadAll": "Baixar tudo",
  "format.downloadAllDesc":
    "MP4 na melhor qualidade, áudio separado, miniatura e transcrições de uma só vez.",
  "format.type": "Tipo",
  "format.mediaType": "Tipo de mídia",
  "format.video": "Vídeo",
  "format.audioOnly": "Apenas áudio",
  "format.audioFormat": "Formato de áudio",
  "format.wavLossless": "WAV (sem perdas)",
  "format.maxQuality": "Qualidade máxima",
  "format.maxQualityAriaLabel": "Qualidade máxima do vídeo",
  "format.bestAvailable": "Melhor disponível",
  "format.thumbnail": "Miniatura",
  "format.thumbnailOff": "Desativada",
  "format.thumbnailSave": "Salvar como imagem",
  "format.thumbnailEmbed": "Incorporar como capa",
  "format.thumbnailBoth": "Salvar e incorporar",
  "format.compatible": "Compatível com editores (H.264)",
  "format.compatibleDesc":
    "Prioriza H.264 + AAC para o Premiere, DaVinci e outros importarem vídeo e áudio. Desmarcado pode vir AV1/VP9 (só áudio em alguns editores).",
  "format.wholePlaylist": "Playlist inteira",
  "format.wholePlaylistDesc": "Quando o link fizer parte de uma playlist, baixar todos os itens.",
  "format.lockedByDownloadAll": "As opções de formato são definidas por “Baixar tudo”.",

  // Subtitles card
  "subtitles.title": "Legendas e transcrições",
  "subtitles.download": "Baixar legendas",
  "subtitles.downloadDesc": "Salvas ao lado do vídeo como arquivos separados.",
  "subtitles.includeAuto": "Incluir geradas automaticamente",
  "subtitles.includeAutoDesc": "Usar legendas automáticas quando não houver legendas manuais.",
  "subtitles.languages": "Idiomas",
  "subtitles.changeLanguageTitle": "Defina o idioma das legendas nas Configurações",
  "subtitles.change": "Alterar",
  "subtitles.fileFormat": "Formato do arquivo",
  "subtitles.subtitleFormat": "Formato da legenda",
  "subtitles.embedInVideo": "Incorporar no vídeo",
  "subtitles.embedInVideoDesc": "Também adicionar faixas de legenda dentro do MP4.",

  // Output card
  "output.title": "Salvar em",
  "output.dialogTitle": "Salvar downloads em",
  "output.noFolder": "Nenhuma pasta selecionada",
  "output.change": "Alterar…",
  "output.showFolder": "Mostrar pasta",

  // Cookies card & settings
  "cookies.title": "Cookies",
  "cookies.summaryOff":
    "Desativado. Ative para vídeos com restrição de idade, para membros ou “não sou um robô”.",
  "cookies.summaryBrowser": "De {browser}",
  "cookies.summaryFile": "cookies.txt: {file}",
  "cookies.noFileSelected": "nenhum arquivo selecionado",
  "cookies.configure": "Configurar…",
  "cookies.openInBrowser": "Abrir link no navegador",
  "cookies.openInBrowserTitle": "Abrir o link no navegador padrão para fazer login",
  "cookies.settingsDescription":
    "Necessário para vídeos com restrição de idade, exclusivos para membros ou com verificação “confirme que você não é um robô”. Usado em todos os downloads, incluindo lotes.",
  "cookies.source": "Fonte de cookies",
  "cookies.none": "Nenhum",
  "cookies.fromBrowser": "Do navegador",
  "cookies.file": "cookies.txt",
  "cookies.howToExport": "Como exportar o cookies.txt",
  "cookies.browser": "Navegador",
  "cookies.notDetected": " (não detectado)",
  "cookies.reliabilityGood": "Confiável",
  "cookies.reliabilityLimited": "Requer permissão",
  "cookies.reliabilityPoor": "Frequentemente bloqueado",
  "cookies.profile": "Perfil",
  "cookies.profilePlaceholder": "Padrão",
  "cookies.profileAriaLabel": "Perfil do navegador (opcional)",
  "cookies.profileTitle":
    "Nome ou caminho do perfil, ex.: “Profile 1”. Deixe em branco para usar o perfil padrão.",
  "cookies.chooseDialogTitle": "Escolher arquivo cookies.txt",
  "cookies.filterNetscape": "Cookies Netscape",
  "cookies.noFileSelectedCap": "Nenhum arquivo selecionado",
  "cookies.choose": "Escolher…",
  "cookies.reportCount": "{count} cookies",
  "cookies.reportExpired": " ({count} expirados)",
  "cookies.reportDomains": " para {domains}",

  // Command preview
  "preview.title": "Prévia do comando",
  "preview.show": "Mostrar",
  "preview.hide": "Ocultar",
  "preview.copyAriaLabel": "Copiar comando",
  "preview.copyError": "Não foi possível copiar: {error}",

  // Job list
  "jobs.title": "Downloads",
  "jobs.resumeQueue": "Retomar fila",
  "jobs.pauseQueue": "Pausar fila",
  "jobs.clearQueue": "Limpar fila",
  "jobs.clearFinished": "Limpar concluídos",
  "jobs.empty": "Os downloads que você iniciar aparecerão aqui.",
  "jobs.waitingOne": "1 download aguardando",
  "jobs.waitingOther": "{count} downloads aguardando",
  "jobs.queuePausedBlocked": "O site está bloqueando · fila pausada, {waiting}",
  "jobs.queuePaused": "Fila pausada · {waiting}",
  "jobs.setUpCookies": "Configurar cookies",
  "jobs.resume": "Retomar",
  "jobs.queued": "Na fila",
  "jobs.removeFromQueue": "Remover da fila",
  "jobs.moreQueued": "e mais {count} na fila…",
  "jobs.cancelling": "Cancelando…",
  "jobs.starting": "Iniciando…",
  "jobs.eta": "ETA {eta}",
  "jobs.bytesOf": "{downloaded} de {total}",
  "jobs.postProcessing": "Pós-processando…",
  "jobs.done": "Concluído",
  "jobs.doneFiles": "Concluído · {count} arquivos",
  "jobs.partial": "Concluído com erros · {count} salvos",
  "jobs.failed": "Falhou",
  "jobs.cancelled": "Cancelado",
  "jobs.cancelDownload": "Cancelar download",
  "jobs.showInFolder": "Mostrar na pasta",
  "jobs.retry": "Tentar novamente",
  "jobs.hideLog": "Ocultar log",
  "jobs.showLog": "Mostrar log",
  "jobs.noOutputYet": "Nenhuma saída ainda.",

  // Postprocessors
  "postprocessor.Merger": "Mesclando vídeo e áudio",
  "postprocessor.ExtractAudio": "Extraindo áudio",
  "postprocessor.EmbedThumbnail": "Incorporando miniatura",
  "postprocessor.ThumbnailsConvertor": "Convertendo miniatura",
  "postprocessor.EmbedSubtitle": "Incorporando legendas",
  "postprocessor.SubtitlesConvertor": "Convertendo legendas",
  "postprocessor.Metadata": "Gravando metadados",
  "postprocessor.MoveFiles": "Finalizando",
  "postprocessor.Fixup": "Ajustando contêiner",
  "postprocessor.other": "Pós-processando ({name})",

  // Settings dialog
  "settings.title": "Configurações",
  "settings.section": "Seção de configurações",
  "settings.tabGeneral": "Geral",
  "settings.tabCookies": "Cookies",
  "settings.tabEngine": "Mecanismo",
  "settings.close": "Fechar",
  "settings.appearance": "Aparência",
  "settings.theme": "Tema",
  "settings.themeLight": "Claro",
  "settings.themeDark": "Escuro",
  "settings.themeSystem": "Sistema",
  "settings.language": "Idioma",
  "settings.subtitles": "Legendas",
  "settings.subtitleLanguage": "Idioma",
  "settings.subtitleLanguageAria": "Idioma da legenda",
  "settings.custom": "Personalizado…",
  "settings.languageCodes": "Códigos de idioma",
  "settings.languageCodesAria": "Códigos de idioma da legenda",
  "settings.languageCodesTitle":
    "Códigos separados por vírgula, ex.: en,pt-BR. Padrões regex como en.* são permitidos.",
  "settings.subtitlesNote":
    "Usado sempre que as legendas estão ativadas. O YouTube frequentemente recusa legendas traduzidas automaticamente; quando isso acontece, o vídeo ainda é salvo e o download exibe um aviso.",
  "settings.batchDownloads": "Downloads em lote",
  "settings.simultaneousDownloads": "Downloads simultâneos",
  "settings.batchNote":
    "Links extras aguardam na fila. Se o site pedir login ou limitar as requisições, a fila é pausada para que você possa ativar os cookies e retomar.",
  "settings.engine": "Mecanismo",
  "settings.recheck": "Verificar novamente",
  "settings.chooseExecutable": "Escolher executável",
  "settings.installOneCommand": "Instale com um comando",
  "settings.ytdlpGuide": "Guia de instalação do yt-dlp",
  "settings.ffmpegDownloads": "Downloads do ffmpeg",
  "settings.notFound": "não encontrado",
  "settings.sourceCustom": "personalizado",
  "settings.sourceBundled": "integrado",
  "settings.sourceSystem": "sistema",
  "settings.useAutomatic": "Usar automático",
  "settings.browse": "Procurar…",
  "settings.checking": "Verificando…",

  // Backend messages (warnings, hints, errors, browser notes)
  "backend.warn.ffmpegMissing":
    "O ffmpeg não foi encontrado. Mesclagem de vídeo e áudio, extração de áudio e conversão de arquivos falharão.",
  "backend.warn.broadSubLangs":
    "Padrões amplos de idioma com legendas automáticas podem baixar dezenas de faixas traduzidas e acionar limites de requisição do YouTube (HTTP 429).",
  "backend.warn.subsInAudio":
    "Legendas não podem ser incorporadas em arquivos de áudio; elas serão salvas separadamente.",
  "backend.warn.wavThumbnail":
    "Arquivos WAV não suportam capa embutida, então a miniatura será salva como uma imagem separada.",
  "backend.warn.subtitleFailed":
    "Algumas faixas de legenda não puderam ser baixadas. O YouTube frequentemente recusa legendas traduzidas automaticamente; veja o log para detalhes.",
  "backend.browser.firefox": "Opção mais confiável em todas as plataformas.",
  "backend.browser.safariMac":
    "Requer Acesso Total ao Disco para este aplicativo (Ajustes do Sistema → Privacidade e Segurança).",
  "backend.browser.safariOther": "O Safari está disponível apenas no macOS.",
  "backend.browser.chromiumMac":
    'O macOS pede acesso às Chaves ("Safe Storage") na primeira vez. Clique em Permitir.',
  "backend.browser.chromiumWin":
    "Versões recentes bloqueiam e criptografam cookies (App-Bound Encryption). Feche o navegador completamente ou use o Firefox / cookies.txt.",
  "backend.browser.linuxKeyring": "Requer acesso ao seu chaveiro (GNOME Keyring / KWallet).",
  "backend.cookieFile.notTxt": "Escolha um arquivo .txt no formato de cookies Netscape.",
  "backend.cookieFile.notFile": "Isto não é um arquivo.",
  "backend.cookieFile.tooLarge": "O arquivo é grande demais para ser um cookies.txt.",
  "backend.cookieFile.notReadable": "Arquivo não encontrado ou não pôde ser lido.",
  "backend.cookieFile.jsonExport":
    "Isto parece uma exportação de cookies em JSON. Exporte no formato Netscape (cookies.txt).",
  "backend.cookieFile.noneFound": "Nenhum cookie no formato Netscape (cookies.txt) foi encontrado.",
  "backend.cookieFile.allExpired":
    "Todos os cookies neste arquivo expiraram. Exporte uma nova cópia.",
  "backend.hint.authRequired":
    "Este vídeo precisa de uma sessão conectada. Abra Configurações → Cookies e escolha seu navegador (o Firefox é o mais confiável) ou importe um arquivo cookies.txt.",
  "backend.hint.authRequiredWithCookies":
    "Os cookies foram enviados, mas o site ainda pede login. Faça login novamente naquele navegador (ou exporte um novo cookies.txt) e tente novamente.",
  "backend.hint.cookieExtraction":
    "O yt-dlp não conseguiu ler os cookies do seu navegador. Feche o navegador completamente e tente novamente, mude para o Firefox ou importe um arquivo cookies.txt.",
  "backend.hint.cookieFile":
    "O arquivo de cookies não pôde ser usado. Exporte-o novamente no formato Netscape (cookies.txt) enquanto estiver conectado.",
  "backend.hint.rateLimited":
    "O site está limitando as requisições. Aguarde alguns minutos ou faça login com cookies (Configurações → Cookies).",
  "backend.hint.forbidden":
    "O site recusou a requisição (HTTP 403). Atualizar o yt-dlp geralmente resolve isso; fazer login com cookies também pode ajudar.",
  "backend.hint.geoRestricted": "Este vídeo não está disponível na sua região.",
  "backend.hint.ffmpegMissing":
    "Instale o ffmpeg (ou defina o caminho dele nas Configurações) para mesclar e converter mídias.",
  "backend.hint.unsupportedUrl": "O yt-dlp não reconhece este link. Verifique a URL.",
  "backend.hint.unavailable": "O vídeo está indisponível, privado ou foi removido.",
  "backend.hint.network": "Verifique sua conexão com a internet e tente novamente.",
  "backend.hint.unknown":
    "Veja o log para detalhes. Atualizar o yt-dlp frequentemente corrige erros de extração.",
  "backend.hint.checkYtdlpPath": "Verifique o caminho do yt-dlp nas Configurações.",
  "backend.error.emptyUrl": "Insira uma URL",
  "backend.error.chooseOutputDir": "Escolha uma pasta de destino",
  "backend.error.outputDirMissing": "A pasta de destino não existe.",
  "backend.error.chooseCookieFile": "Escolha um arquivo cookies.txt",
  "backend.error.invalidCookieFile": "O arquivo de cookies não é válido.",
  "backend.error.safariMacOnly": "Cookies do Safari estão disponíveis apenas no macOS",
  "backend.error.profileColons": 'Nomes de perfil do navegador não podem conter "::"',
  "backend.error.binaryNotRunnable":
    "Encontrado, mas não pôde ser executado. Verifique se possui permissão de execução.",
};
