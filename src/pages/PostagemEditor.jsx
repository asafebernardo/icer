import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Fragment,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Plus,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Film,
  Headphones,
  Image,
  Youtube,
  Maximize2,
  Globe,
  Link2,
  Lock,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

import PageHeader from "../components/shared/PageHeader";
import SafeImg from "../components/shared/SafeImg";
import MediaKindCornerBadge from "../components/shared/MediaKindCornerBadge";
import PostImagesBlock, {
  GalleryFeaturedStar,
} from "@/components/posts/PostImagesBlock";
import PostGalleryByDay, {
  formatSecaoGaleriaHeading,
} from "@/components/posts/PostGalleryByDay";
import { PostMedia } from "@/components/posts/PostMedia";
import AnexoOrderMosaicDnd, {
  ANEXO_ORDER_MOSAIC_CELL,
  ANEXO_ORDER_MOSAIC_COLS,
} from "@/components/posts/AnexoOrderMosaicDnd";
import EditorAnexoSlidesPreviewDialog, {
  AnexoPreviewOpenButton,
} from "@/components/posts/EditorAnexoSlidesPreviewDialog";

import { getUser, canMenuAction, MENU } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { useEditMode } from "@/lib/EditModeContext";
import { uploadIntegrationFile } from "@/lib/uploadImage";
import { withCsrfHeaderAsync } from "@/lib/csrf";
import {
  appendYoutubeSlidesFromUrls,
  buildSlidesFromAnexos,
  collectPostFeaturedEligibleUrls,
  collectVisualMediaUrlsFromAnexos,
  dedupeTagsPreserveOrder,
  normalizeDiasGaleria,
  normalizePost,
  normalizeTagKey,
  normalizeVideoUrlsFromPost,
  urlsToSlides,
} from "@/lib/posts";
import { cn } from "@/lib/utils";
import {
  POST_CATEGORIAS,
  normalizeStoredPostCategoria,
} from "@/lib/postCategories";
import {
  FieldHintMessage,
  MSG_CAMPO_OBRIGATORIO,
} from "@/components/shared/FieldHintMessage";
import { toast } from "sonner";

const pad2 = (n) => String(n).padStart(2, "0");


const POST_EDITOR_STEPS = [
  { id: 1, title: "Texto" },
  { id: 2, title: "Multimídia" },
  { id: 3, title: "Secções" },
  { id: 4, title: "Ordem" },
  { id: 5, title: "Pré-visualização" },
];


/** ISO ou valor gravado → `YYYY-MM-DD` para `<input type="date">` */
function isoToDateInputValue(iso) {
  if (!iso) return "";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return "";
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  } catch {
    return "";
  }
}

function todayDateInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** `YYYY-MM-DD` do utilizador → ISO (meio-dia local, estável entre fusos) */
function dateInputToIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
  if (!isValid(d)) return null;
  return d.toISOString();
}

function isImageMime(mime) {
  return typeof mime === "string" && mime.startsWith("image/");
}

function isVideoAttachmentUrl(anexos, url) {
  const a = anexos.find((x) => x && x.url === url);
  return typeof a?.mime === "string" && a.mime.startsWith("video/");
}

/** Erros por campo na etapa 1 (chaves: titulo, descricao, dataPublicacao). */
function getStep1FieldErrors(titulo, descricao, dataPublicacao) {
  const e = {};
  if (!String(titulo || "").trim()) e.titulo = MSG_CAMPO_OBRIGATORIO;
  if (!String(descricao || "").trim()) e.descricao = MSG_CAMPO_OBRIGATORIO;
  const raw = String(dataPublicacao || "").trim();
  if (!raw) {
    e.dataPublicacao = MSG_CAMPO_OBRIGATORIO;
  } else if (!dateInputToIso(dataPublicacao)) {
    e.dataPublicacao = "Indique uma data válida.";
  }
  return e;
}

/** Erros na etapa 2: midia; youtube_{i} por linha de URL inválido. */
function getStep2FieldErrors(anexos, video_urls) {
  const errs = {};
  const hasAttachments = Array.isArray(anexos) && anexos.length > 0;
  const ytClean = video_urls.map((s) => String(s || "").trim()).filter(Boolean);
  const hasVideoUrl = ytClean.length > 0;
  if (!hasAttachments && !hasVideoUrl) {
    errs.midia =
      "Adicione pelo menos uma imagem ou um URL do YouTube.";
    return errs;
  }
  video_urls.forEach((raw, i) => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return;
    try {
      const u = new URL(trimmed);
      if (!(u.protocol === "http:" || u.protocol === "https:")) {
        errs[`youtube_${i}`] = "Indique um URL válido (http/https).";
      }
    } catch {
      errs[`youtube_${i}`] = "Indique um URL válido (http/https).";
    }
  });
  return errs;
}

/**
 * Erros na etapa 3 (galeria por secções): galeriaGlobal; secTitulo_{i} por secção.
 */
function getGaleriaPorSecoesFieldErrors(usarGaleriaPorDia, anexos, diasGaleria) {
  const errs = {};
  if (!usarGaleriaPorDia) return errs;
  const visualUrls = collectVisualMediaUrlsFromAnexos(anexos);
  if (!visualUrls.length) {
    errs.galeriaGlobal =
      "Adicione imagens nos anexos para usar galeria por secções.";
    return errs;
  }
  if (!diasGaleria.length) {
    errs.galeriaGlobal = "Adicione pelo menos uma secção.";
    return errs;
  }
  diasGaleria.forEach((s, i) => {
    if (!String(s.titulo || "").trim()) {
      errs[`secTitulo_${i}`] = MSG_CAMPO_OBRIGATORIO;
    }
  });
  const assigned = new Set();
  for (const s of diasGaleria) {
    for (const u of s.imagens_urls) {
      if (assigned.has(u)) {
        errs.galeriaGlobal =
          "Cada ficheiro só pode pertencer a uma secção.";
        return errs;
      }
      if (!visualUrls.includes(u)) {
        errs.galeriaGlobal =
          "Há referências a ficheiros que já não existem nos anexos.";
        return errs;
      }
      assigned.add(u);
    }
  }
  for (const u of visualUrls) {
    if (!assigned.has(u)) {
      errs.galeriaGlobal =
        "Atribua todos os ficheiros a uma secção (área «Por atribuir»).";
      return errs;
    }
  }
  return errs;
}

/** Ordem em que o primeiro erro deve receber foco/scroll (consistente com o formulário). */
function sortFieldHintKeysForScroll(keys) {
  const priority = [
    "titulo",
    "descricao",
    "dataPublicacao",
    "midia",
    "galeriaGlobal",
  ];
  const rank = (k) => {
    const pi = priority.indexOf(k);
    if (pi >= 0) return pi;
    const ym = /^youtube_(\d+)$/.exec(k);
    if (ym) return 50 + Number(ym[1]);
    const sm = /^secTitulo_(\d+)$/.exec(k);
    if (sm) return 150 + Number(sm[1]);
    return 800;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b));
}

export default function PostagemEditor() {
  const { id: postIdParam } = useParams();
  const postId =
    postIdParam != null && String(postIdParam).trim() !== ""
      ? Number(postIdParam)
      : NaN;
  const invalidEditId =
    postIdParam != null &&
    String(postIdParam).trim() !== "" &&
    !Number.isFinite(postId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const categoriaPresetRef = useRef("");
  categoriaPresetRef.current = normalizeStoredPostCategoria(
    searchParams.get("categoria"),
  );
  const { user: authUser, checkUserAuth } = useAuth();

  useEffect(() => {
    checkUserAuth?.();
  }, [location.pathname, checkUserAuth]);

  const sessionUser = authUser ?? getUser();
  const { enabled: editMode } = useEditMode();
  const canCreate = canMenuAction(sessionUser, MENU.POSTAGENS, "create");
  const canEdit = canMenuAction(sessionUser, MENU.POSTAGENS, "edit");
  const autorEmail = sessionUser?.email || "";

  const isEditMode = Number.isFinite(postId) && postId > 0;

  useEffect(() => {
    if (invalidEditId) navigate("/Posts", { replace: true });
  }, [invalidEditId, navigate]);

  useEffect(() => {
    if (!isEditMode && !canCreate) {
      navigate("/Posts", { replace: true });
      return;
    }
    if (isEditMode && !canEdit) {
      navigate("/Posts", { replace: true });
    }
  }, [isEditMode, canCreate, canEdit, navigate]);

  const {
    data: loadedPost,
    isLoading: loadingPost,
    isError: loadPostError,
    error: loadPostErrorObj,
  } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const r = await fetch(`/api/data/posts/${postId}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) {
        const text = await r.text();
        let msg = "Não foi possível carregar o post.";
        try {
          const j = text ? JSON.parse(text) : null;
          if (j?.message) msg = j.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      return r.json();
    },
    enabled: isEditMode,
  });

  const createPost = useMutation({
    mutationFn: async (data) => {
      const r = await fetch("/api/data/posts", {
        method: "POST",
        credentials: "include",
        headers: await withCsrfHeaderAsync({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify(data),
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const msg = parsed?.message || "Não foi possível criar o post.";
        throw new Error(msg);
      }
      return parsed;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post publicado com sucesso.");
      const cat = normalizeStoredPostCategoria(data?.categoria);
      navigate(cat ? `/Posts/categoria/${cat}` : "/Posts");
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const r = await fetch(`/api/data/posts/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: await withCsrfHeaderAsync({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify(data),
      });
      const text = await r.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const msg = parsed?.message || "Não foi possível atualizar o post.";
        throw new Error(msg);
      }
      return parsed;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      toast.success("Post salvo com sucesso.");
      const cat = normalizeStoredPostCategoria(variables.categoria);
      navigate(cat ? `/Posts/categoria/${cat}` : "/Posts");
    },
  });


  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState([]);
  const [video_urls, setVideoUrls] = useState([""]);
  const [dataPublicacao, setDataPublicacao] = useState(() =>
    todayDateInputValue(),
  );
  const [carousel_interval_sec, setCarouselInterval] = useState(5);
  const [categoria, setCategoria] = useState("");
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [editingTagIdx, setEditingTagIdx] = useState(-1);
  const [editingTagDraft, setEditingTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  /** Progresso global 0–100 ao enviar vários ficheiros na etapa 2 */
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadAudioBusy, setUploadAudioBusy] = useState(false);
  const [audioAmbienteUrl, setAudioAmbienteUrl] = useState("");
  const [audioAmbienteEscopo, setAudioAmbienteEscopo] =
    useState("todas_secoes");
  const [error, setError] = useState("");
  /** Mensagens inline por campo (ex.: titulo, midia, secTitulo_0); expiram em 3s ou ao editar. */
  const [fieldHints, setFieldHints] = useState({});
  const fieldHintTimersRef = useRef({});
  const fieldHintAnchorRefs = useRef({});
  /** Evita `reset()` repetido em «novo post» (ex.: re-render após upload). */
  const didInitCreateFormRef = useRef(false);
  /** Hidratação única por id ao editar (refetch não deve voltar à etapa 1). */
  const hydratedPostIdRef = useRef(null);
  const [step, setStep] = useState(1);
  /** URL de uma imagem anexa ou "" = usar primeira imagem na ordem */
  const [imagemDestaqueUrl, setImagemDestaqueUrl] = useState("");
  const [usarGaleriaPorDia, setUsarGaleriaPorDia] = useState(false);
  const [diasGaleria, setDiasGaleria] = useState([]);
  /** Visibilidade: "public" (qualquer pessoa) | "unlisted" (só com link) | "private" (só admin/dono). */
  const [visibility, setVisibility] = useState("public");
  /** Índice do slide em pré-visualização ampliada (etapas com anexos). */
  const [anexoPreviewIndex, setAnexoPreviewIndex] = useState(null);

  const anexoPreviewSlides = useMemo(
    () => buildSlidesFromAnexos(anexos),
    [anexos],
  );

  const openAnexoPreview = useCallback(
    (url) => {
      const u = String(url || "").trim();
      if (!u) return;
      const idx = anexoPreviewSlides.findIndex((s) => s.url === u);
      if (idx >= 0) setAnexoPreviewIndex(idx);
    },
    [anexoPreviewSlides],
  );

  useEffect(() => {
    if (
      anexoPreviewIndex != null &&
      anexoPreviewIndex >= anexoPreviewSlides.length
    ) {
      setAnexoPreviewIndex(null);
    }
  }, [anexoPreviewIndex, anexoPreviewSlides.length]);

  /** Fotos e outros anexos visuais (para secções e «por atribuir»). */
  const visualMediaUrlsForDias = useMemo(
    () => collectVisualMediaUrlsFromAnexos(anexos),
    [anexos],
  );

  /** Só imagens — destaque por omissão na lista (sem estrela). */
  const imageUrlsForFeatured = useMemo(
    () =>
      anexos
        .filter((a) => a && isImageMime(a.mime) && a.url)
        .map((a) => a.url),
    [anexos],
  );

  /** Fotos e vídeos de anexo que podem receber estrela. */
  const featuredEligibleUrls = useMemo(
    () => collectPostFeaturedEligibleUrls({ anexos }),
    [anexos],
  );

  const anexosComIndiceImagens = useMemo(
    () =>
      anexos
        .map((a, i) => ({ anexo: a, idx: i }))
        .filter(({ anexo }) => isImageMime(anexo?.mime)),
    [anexos],
  );

  const anexosComIndiceVideos = useMemo(
    () =>
      anexos
        .map((a, i) => ({ anexo: a, idx: i }))
        .filter(
          ({ anexo }) =>
            typeof anexo?.mime === "string" &&
            anexo.mime.startsWith("video/"),
        ),
    [anexos],
  );

  const reset = useCallback(() => {
    setTitulo("");
    setDescricao("");
    setAnexos([]);
    setVideoUrls([""]);
    setDataPublicacao(todayDateInputValue());
    setCarouselInterval(5);
    setCategoria(categoriaPresetRef.current);
    setTags([]);
    setTagDraft("");
    setEditingTagIdx(-1);
    setEditingTagDraft("");
    setImagemDestaqueUrl("");
    setUsarGaleriaPorDia(false);
    setDiasGaleria([]);
    setAudioAmbienteUrl("");
    setAudioAmbienteEscopo("todas_secoes");
    setVisibility("public");
    setError("");
    setFieldHints({});
    Object.values(fieldHintTimersRef.current).forEach((t) => clearTimeout(t));
    fieldHintTimersRef.current = {};
    setStep(1);
  }, []);

  useEffect(() => {
    if (isEditMode) {
      didInitCreateFormRef.current = false;
      return;
    }
    hydratedPostIdRef.current = null;
    if (didInitCreateFormRef.current) return;
    didInitCreateFormRef.current = true;
    reset();
  }, [isEditMode, reset]);

  useEffect(() => {
    if (!isEditMode || !loadedPost) return;
    const postKey =
      loadedPost.id != null
        ? String(loadedPost.id)
        : loadedPost.updated_at != null
          ? String(loadedPost.updated_at)
          : null;
    if (postKey && hydratedPostIdRef.current === postKey) return;
    if (postKey) hydratedPostIdRef.current = postKey;
    const p = normalizePost(loadedPost);
    setTitulo(p.titulo);
    setDescricao(p.descricao);
    setAnexos([...(p.anexos || [])]);
    {
      const vu = normalizeVideoUrlsFromPost(p);
      setVideoUrls(vu.length > 0 ? vu : [""]);
    }
    setDataPublicacao(isoToDateInputValue(p.data_publicacao));
    setCarouselInterval(p.carousel_interval_sec);
    setCategoria(normalizeStoredPostCategoria(p.categoria));
    setTags(dedupeTagsPreserveOrder(p.tags || []));
    setTagDraft("");
    setEditingTagIdx(-1);
    setEditingTagDraft("");
    setImagemDestaqueUrl(String(p.imagem_destaque_url ?? "").trim());
    setUsarGaleriaPorDia(Boolean(p.usar_galeria_por_dia));
    setDiasGaleria(normalizeDiasGaleria(p.dias_galeria));
    setAudioAmbienteUrl(String(p.audio_ambiente_url ?? "").trim());
    setAudioAmbienteEscopo(
      p.audio_ambiente_escopo === "por_secao" ? "por_secao" : "todas_secoes",
    );
    setVisibility(
      p.visibility === "private" || p.visibility === "unlisted"
        ? p.visibility
        : "public",
    );
    setError("");
    setFieldHints({});
    Object.values(fieldHintTimersRef.current).forEach((t) => clearTimeout(t));
    fieldHintTimersRef.current = {};
    setStep(1);
  }, [isEditMode, loadedPost]);

  useEffect(() => {
    return () => {
      Object.values(fieldHintTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    if (!usarGaleriaPorDia) return;
    const allowed = new Set(visualMediaUrlsForDias);
    setDiasGaleria((prev) =>
      prev.map((row) => ({
        ...row,
        imagens_urls: row.imagens_urls.filter((u) => allowed.has(u)),
      })),
    );
  }, [visualMediaUrlsForDias, usarGaleriaPorDia]);

  const setFieldHintAnchor = useCallback((key) => (el) => {
    if (el) fieldHintAnchorRefs.current[key] = el;
    else delete fieldHintAnchorRefs.current[key];
  }, []);

  const scrollFirstFieldErrorIntoView = useCallback((errKeys) => {
    const keys = sortFieldHintKeysForScroll(errKeys);
    for (const key of keys) {
      const el = fieldHintAnchorRefs.current[key];
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        const focusTarget = el.matches?.(
          "input:not([type='hidden']),textarea,select",
        )
          ? el
          : el.querySelector?.(
              "input:not([type='hidden']),textarea,select",
            );
        focusTarget?.focus?.({ preventScroll: true });
        break;
      }
    }
  }, []);

  const clearFieldHint = useCallback((key) => {
    const t = fieldHintTimersRef.current[key];
    if (t) {
      clearTimeout(t);
      delete fieldHintTimersRef.current[key];
    }
    setFieldHints((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const showFieldHintsBatch = useCallback(
    (errs) => {
      const entries = Object.entries(errs);
      if (!entries.length) return;
      const errKeys = Object.keys(errs);
      setFieldHints((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      entries.forEach(([key]) => {
        if (fieldHintTimersRef.current[key]) {
          clearTimeout(fieldHintTimersRef.current[key]);
        }
        fieldHintTimersRef.current[key] = window.setTimeout(() => {
          setFieldHints((prev) => {
            const n = { ...prev };
            delete n[key];
            return n;
          });
          delete fieldHintTimersRef.current[key];
        }, 3000);
      });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollFirstFieldErrorIntoView(errKeys);
        });
      });
    },
    [scrollFirstFieldErrorIntoView],
  );

  const clearAllFieldHints = useCallback(() => {
    Object.keys(fieldHintTimersRef.current).forEach((key) => {
      clearTimeout(fieldHintTimersRef.current[key]);
      delete fieldHintTimersRef.current[key];
    });
    setFieldHints({});
  }, []);

  /** Quando a validação da galeria deixa de falhar no aviso global, remove a mensagem (ex.: após arrastar ficheiros). */
  useEffect(() => {
    if (!fieldHints.galeriaGlobal) return;
    const errs = getGaleriaPorSecoesFieldErrors(
      usarGaleriaPorDia,
      anexos,
      diasGaleria,
    );
    if (!errs.galeriaGlobal) clearFieldHint("galeriaGlobal");
  }, [
    usarGaleriaPorDia,
    anexos,
    diasGaleria,
    fieldHints.galeriaGlobal,
    clearFieldHint,
  ]);

  /** Remove aviso «adicione imagem ou YouTube» assim que a condição deixa de falhar. */
  useEffect(() => {
    if (!fieldHints.midia) return;
    const errs = getStep2FieldErrors(anexos, video_urls);
    if (!errs.midia) clearFieldHint("midia");
  }, [anexos, video_urls, fieldHints.midia, clearFieldHint]);

  const addTagFromDraft = () => {
    const raw = String(tagDraft || "").replace(/,+$/, "").trim();
    if (!raw) return;
    setTags((cur) => dedupeTagsPreserveOrder([...(cur || []), raw]));
    setTagDraft("");
  };

  const removeTagAt = (idx) => {
    setTags((cur) => (Array.isArray(cur) ? cur.filter((_, i) => i !== idx) : []));
    if (editingTagIdx === idx) {
      setEditingTagIdx(-1);
      setEditingTagDraft("");
    }
  };

  const startEditTag = (idx) => {
    const cur = tags[idx];
    if (cur == null) return;
    setEditingTagIdx(idx);
    setEditingTagDraft(String(cur));
  };

  const commitEditTag = () => {
    if (editingTagIdx < 0) return;
    const raw = String(editingTagDraft || "").replace(/,+$/, "").trim();
    const idx = editingTagIdx;
    setEditingTagIdx(-1);
    setEditingTagDraft("");
    if (!raw) {
      removeTagAt(idx);
      return;
    }
    setTags((cur) => {
      const list = Array.isArray(cur) ? [...cur] : [];
      list[idx] = raw;
      return dedupeTagsPreserveOrder(list);
    });
  };

  const handleAddMedia = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");

    const imageFiles = files.filter((f) =>
      String(f?.type || "").startsWith("image/"),
    );
    if (imageFiles.length !== files.length) {
      setError("Só são permitidas imagens neste envio.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const next = [...anexos];
      const total = imageFiles.length;
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const mime = String(file?.type || "");
        if (!mime.startsWith("image/")) {
          throw new Error("Em posts, só é permitido enviar imagens.");
        }
        const { file_url } = await uploadIntegrationFile(file, {
          purpose: "post_media",
          onProgress: (pct) => {
            const overall = Math.round(((i + pct / 100) / total) * 100);
            setUploadProgress(Math.min(100, overall));
          },
        });
        if (file_url) {
          next.push({
            url: file_url,
            name: file?.name || "",
            mime: file?.type || "",
            size: Number(file?.size) || 0,
          });
        }
      }
      setAnexos(next);
      setUploadProgress(100);
      clearFieldHint("midia");
    } catch (err) {
      setError(
        err?.message ||
          "Não foi possível enviar um ou mais ficheiros. Tente novamente.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddAudioAmbiente = async (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    const mime = String(file?.type || "");
    if (!mime.startsWith("audio/")) {
      setError("Selecione apenas um ficheiro de áudio.");
      e.target.value = "";
      return;
    }
    setUploadAudioBusy(true);
    setError("");
    try {
      const { file_url } = await uploadIntegrationFile(file, {
        purpose: "post_audio",
      });
      if (file_url) setAudioAmbienteUrl(file_url);
    } catch (err) {
      setError(
        err?.message ||
          "Não foi possível enviar o áudio. Tente novamente.",
      );
    } finally {
      setUploadAudioBusy(false);
      e.target.value = "";
    }
  };

  const removeAnexoByUrl = useCallback((url) => {
    const u = String(url || "").trim();
    if (!u) return;
    setImagemDestaqueUrl((cur) => (cur === u ? "" : cur));
    setAnexos((arr) => arr.filter((a) => a?.url !== u));
    setDiasGaleria((prev) =>
      prev.map((s) => ({
        ...s,
        imagens_urls: s.imagens_urls.filter((x) => x !== u),
      })),
    );
  }, []);

  const removePreviewSlideAt = useCallback(
    (slideIndex) => {
      const yt = video_urls.map((s) => String(s || "").trim()).filter(Boolean);
      const slides = appendYoutubeSlidesFromUrls(
        buildSlidesFromAnexos(anexos),
        yt,
      );
      const slide = slides[slideIndex];
      if (!slide) return;
      if (slide.kind === "youtube") {
        const target = String(slide.url || "").trim();
        setVideoUrls((prev) => {
          const next = prev.filter((u) => String(u).trim() !== target);
          return next.length ? next : [""];
        });
        return;
      }
      const url = slide.url;
      setImagemDestaqueUrl((cur) => (cur === url ? "" : cur));
      setAnexos((arr) => arr.filter((a) => a?.url !== url));
    },
    [anexos, video_urls],
  );

  const galleryDragId = (url) =>
    `gal-${String(url).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 220)}`;

  const handleSecoesGaleriaDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    setDiasGaleria((prev) => {
      const getUnassigned = (dg) => {
        const assigned = new Set();
        dg.forEach((s) => {
          s.imagens_urls.forEach((u) => assigned.add(u));
        });
        return visualMediaUrlsForDias.filter((u) => !assigned.has(u));
      };

      if (source.droppableId === destination.droppableId) {
        if (source.droppableId.startsWith("section-")) {
          const m = /^section-(\d+)$/.exec(source.droppableId);
          if (!m) return prev;
          const si = Number(m[1]);
          const list = [...(prev[si]?.imagens_urls || [])];
          if (
            source.index < 0 ||
            source.index >= list.length ||
            destination.index < 0
          ) {
            return prev;
          }
          const [r] = list.splice(source.index, 1);
          list.splice(destination.index, 0, r);
          return prev.map((s, i) =>
            i === si ? { ...s, imagens_urls: list } : s,
          );
        }
        return prev;
      }

      let url;
      if (source.droppableId === "pool-unassigned") {
        const un = getUnassigned(prev);
        url = un[source.index];
      } else {
        const m = /^section-(\d+)$/.exec(source.droppableId);
        if (!m) return prev;
        const si = Number(m[1]);
        url = prev[si]?.imagens_urls[source.index];
      }
      if (!url || !visualMediaUrlsForDias.includes(url)) return prev;

      let next = prev.map((s) => ({
        ...s,
        imagens_urls: s.imagens_urls.filter((u) => u !== url),
      }));

      if (destination.droppableId === "pool-unassigned") {
        return next;
      }

      const md = /^section-(\d+)$/.exec(destination.droppableId);
      if (!md) return next;
      const di = Number(md[1]);
      const destList = [...(next[di]?.imagens_urls || [])];
      const insertAt = Math.min(
        Math.max(0, destination.index),
        destList.length,
      );
      destList.splice(insertAt, 0, url);
      return next.map((s, i) =>
        i === di ? { ...s, imagens_urls: destList } : s,
      );
    });
  };

  const removeUrlFromDiaSection = (secIdx, url) => {
    setDiasGaleria((prev) =>
      prev.map((s, i) =>
        i === secIdx
          ? { ...s, imagens_urls: s.imagens_urls.filter((u) => u !== url) }
          : s,
      ),
    );
  };

  const removeSectionPreviewSlideAt = useCallback(
    (secIdx, slideIdx) => {
      const norm = normalizeDiasGaleria(diasGaleria);
      const sec = norm[secIdx];
      if (!sec) return;
      const imgs = sec.imagens_urls.filter(Boolean);
      const slides = urlsToSlides(imgs, anexos);
      const slide = slides[slideIdx];
      if (!slide?.url) return;
      setDiasGaleria((prev) =>
        prev.map((s, i) =>
          i === secIdx
            ? {
                ...s,
                imagens_urls: s.imagens_urls.filter((u) => u !== slide.url),
              }
            : s,
        ),
      );
      setImagemDestaqueUrl((cur) => (cur === slide.url ? "" : cur));
    },
    [diasGaleria, anexos],
  );

  const appendDiaSection = () => {
    setDiasGaleria((prev) => [
      ...prev,
      {
        titulo: "",
        imagens_urls: [],
        musica_ambiente: true,
      },
    ]);
  };

  const removeDiaSectionAt = (idx) => {
    setDiasGaleria((prev) => prev.filter((_, i) => i !== idx));
  };

  const unassignedImageUrls = useMemo(() => {
    const assigned = new Set();
    diasGaleria.forEach((s) => {
      s.imagens_urls.forEach((u) => assigned.add(u));
    });
    return visualMediaUrlsForDias.filter((u) => !assigned.has(u));
  }, [diasGaleria, visualMediaUrlsForDias]);

  const videoUrlsCleanPreview = useMemo(
    () => video_urls.map((s) => String(s || "").trim()).filter(Boolean),
    [video_urls],
  );

  const previewPubLabel = useMemo(() => {
    const raw = String(dataPublicacao || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "—";
    try {
      const d = parseISO(`${raw}T12:00:00`);
      return isValid(d)
        ? format(d, "dd/MM/yyyy", { locale: ptBR })
        : raw;
    } catch {
      return raw;
    }
  }, [dataPublicacao]);

  const goToStep2 = () => {
    setError("");
    const errs = getStep1FieldErrors(titulo, descricao, dataPublicacao);
    if (Object.keys(errs).length) {
      showFieldHintsBatch(errs);
      return;
    }
    clearAllFieldHints();
    setStep(2);
  };

  const goToStep3 = () => {
    setError("");
    const errs = getStep2FieldErrors(anexos, video_urls);
    if (Object.keys(errs).length) {
      showFieldHintsBatch(errs);
      return;
    }
    clearAllFieldHints();
    setStep(3);
  };

  const goToStep4 = () => {
    setError("");
    const errs = getGaleriaPorSecoesFieldErrors(
      usarGaleriaPorDia,
      anexos,
      diasGaleria,
    );
    if (Object.keys(errs).length) {
      showFieldHintsBatch(errs);
      return;
    }
    clearAllFieldHints();
    setStep(4);
  };

  const goToStep5 = () => {
    setError("");
    clearAllFieldHints();
    setStep(5);
  };

  /** Monta o corpo gravado no servidor (sempre publicado). */
  const buildPostPayload = () => {
    const videoUrlsClean = video_urls
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    let featured = String(imagemDestaqueUrl || "").trim();
    if (featured && !featuredEligibleUrls.includes(featured)) featured = "";

    const pubIso = dateInputToIso(dataPublicacao);

    return {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      anexos,
      video_urls: videoUrlsClean,
      video_url: videoUrlsClean[0] || "",
      data_publicacao: pubIso,
      carousel_interval_sec: Math.min(
        60,
        Math.max(2, Number(carousel_interval_sec) || 5),
      ),
      tags: dedupeTagsPreserveOrder(tags),
      categoria: categoria || undefined,
      autor: autorEmail || "",
      imagem_destaque_url: featured,
      usar_galeria_por_dia: usarGaleriaPorDia,
      audio_ambiente_url: String(audioAmbienteUrl || "").trim(),
      audio_ambiente_escopo:
        audioAmbienteEscopo === "por_secao" ? "por_secao" : "todas_secoes",
      dias_galeria: usarGaleriaPorDia
        ? normalizeDiasGaleria(diasGaleria).map((row) => {
            const base = {
              titulo: String(row.titulo || "").trim(),
              imagens_urls: row.imagens_urls,
            };
            if (audioAmbienteEscopo === "por_secao") {
              base.musica_ambiente = row.musica_ambiente !== false;
            }
            return base;
          })
        : [],
      visibility:
        visibility === "private" || visibility === "unlisted"
          ? visibility
          : "public",
      status: "published",
    };
  };

  const handleSubmit = () => {
    setError("");
    clearAllFieldHints();
    const step1Errs = getStep1FieldErrors(titulo, descricao, dataPublicacao);
    if (Object.keys(step1Errs).length) {
      setStep(1);
      showFieldHintsBatch(step1Errs);
      return;
    }
    const step2Errs = getStep2FieldErrors(anexos, video_urls);
    if (Object.keys(step2Errs).length) {
      setStep(2);
      showFieldHintsBatch(step2Errs);
      return;
    }

    const galErrs = getGaleriaPorSecoesFieldErrors(
      usarGaleriaPorDia,
      anexos,
      diasGaleria,
    );
    if (Object.keys(galErrs).length) {
      setStep(3);
      showFieldHintsBatch(galErrs);
      return;
    }

    const payload = buildPostPayload();
    if (isEditMode) {
      updatePost.mutate({ id: postId, ...payload });
    } else {
      createPost.mutate(payload);
    }
  };

  if (isEditMode && loadingPost) {
    return (
      <div>
        <PageHeader
          pageKey="postagens"
          tag="Comunidade"
          title="Editar post"
          description="A carregar…"
        />
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">A carregar…</p>
        </section>
      </div>
    );
  }

  if (isEditMode && loadPostError) {
    return (
      <div>
        <PageHeader
          pageKey="postagens"
          tag="Comunidade"
          title="Editar post"
          description="Não foi possível abrir o formulário."
        />
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="text-sm text-destructive">
            {loadPostErrorObj?.message || "Erro ao carregar o post."}
          </p>
          <Button variant="outline" asChild>
            <Link to="/Posts">Voltar aos Posts</Link>
          </Button>
        </section>
      </div>
    );
  }

  const saving = createPost.isPending || updatePost.isPending;

  return (
    <div>
      <PageHeader
        pageKey="postagens"
        tag="Comunidade"
        title={isEditMode ? "Editar post" : "Novo post"}
      />

      <section className="mx-auto max-w-7xl px-3 pb-28 pt-2 sm:px-6 sm:pb-24 sm:pt-8 lg:px-8">
        <div className="mb-6">
          <Button variant="ghost" className="gap-2 -ml-2 w-fit" asChild>
            <Link to="/Posts">
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Voltar aos Posts
            </Link>
          </Button>
        </div>

        <div className="space-y-4 py-2">
          {error ? (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}

          {step >= 1 ? (
          <nav
            aria-label="Etapas do formulário"
            className="-mx-4 mb-3 border-b border-border/70 bg-muted/20 px-3 py-2 sm:mx-0 sm:mb-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
          >
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:hidden">
              Etapa {step} de {POST_EDITOR_STEPS.length} ·{" "}
              {POST_EDITOR_STEPS.find((s) => s.id === step)?.title ?? ""}
            </p>
            <ol className="m-0 flex list-none flex-nowrap items-stretch gap-1.5 overflow-x-auto overscroll-x-contain p-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:gap-x-1 sm:gap-y-2 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
              {POST_EDITOR_STEPS.map(({ id: sid, title }, idx) => (
                <Fragment key={sid}>
                  {idx > 0 ? (
                    <li
                      aria-hidden="true"
                      className="flex w-4 shrink-0 items-center justify-center self-center sm:w-5"
                    >
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/45" />
                    </li>
                  ) : null}
                  <li
                    className={cn(
                      "flex min-h-[2.75rem] min-w-[6.75rem] max-w-[9.5rem] shrink-0 snap-start flex-col justify-center gap-1 rounded-lg border px-2.5 py-2 text-xs transition-colors sm:min-h-[3rem] sm:min-w-[7.5rem] sm:max-w-none sm:flex-1 sm:flex-row sm:items-center sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-sm",
                      step === sid
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border bg-background/90 text-muted-foreground sm:bg-muted/20",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm",
                        step === sid
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                      aria-current={step === sid ? "step" : undefined}
                    >
                      {sid}
                    </span>
                    <span className="min-w-0 leading-tight sm:font-medium">
                      {title}
                    </span>
                  </li>
                </Fragment>
              ))}
            </ol>
          </nav>
          ) : null}

          <div
            className={cn("space-y-4", step !== 1 && "hidden")}
            aria-hidden={step !== 1}
          >
          <div
            className="space-y-2 scroll-mt-28"
            ref={setFieldHintAnchor("titulo")}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
              <Label htmlFor="post-titulo">Título *</Label>
              <FieldHintMessage
                message={fieldHints.titulo}
                className="text-sm text-destructive"
              />
            </div>
            <Input
              id="post-titulo"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                clearFieldHint("titulo");
              }}
              placeholder="Título da publicação"
              aria-invalid={!!fieldHints.titulo}
              className={cn(
                fieldHints.titulo &&
                  "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
              )}
            />
          </div>

          <div
            className="space-y-2 scroll-mt-28"
            ref={setFieldHintAnchor("descricao")}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
              <Label htmlFor="post-desc">Descrição *</Label>
              <FieldHintMessage
                message={fieldHints.descricao}
                className="text-sm text-destructive"
              />
            </div>
            <Textarea
              id="post-desc"
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                clearFieldHint("descricao");
              }}
              placeholder="Texto da publicação"
              className={cn(
                "min-h-[100px] resize-y",
                fieldHints.descricao &&
                  "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
              )}
              aria-invalid={!!fieldHints.descricao}
            />
          </div>
          <div
            className="space-y-2 scroll-mt-28"
            ref={setFieldHintAnchor("dataPublicacao")}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
              <Label htmlFor="post-data">Data da publicação *</Label>
              <FieldHintMessage
                message={fieldHints.dataPublicacao}
                className="text-sm text-destructive"
              />
            </div>
            <Input
              id="post-data"
              type="date"
              value={dataPublicacao}
              onChange={(e) => {
                setDataPublicacao(e.target.value);
                clearFieldHint("dataPublicacao");
              }}
              aria-invalid={!!fieldHints.dataPublicacao}
              className={cn(
                fieldHints.dataPublicacao &&
                  "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-categoria">Categoria</Label>
            <Select
              value={categoria || "__none__"}
              onValueChange={(value) =>
                setCategoria(value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger id="post-categoria" className="w-full">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {POST_CATEGORIAS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags (opcional)</Label>
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="Digite e pressione Enter ou vírgula…"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTagFromDraft();
                }
                if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
                  removeTagAt(tags.length - 1);
                }
              }}
              onBlur={() => addTagFromDraft()}
            />
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t, idx) => {
                  const isEditing = editingTagIdx === idx;
                  return (
                    <span
                      key={`${normalizeTagKey(t)}-${idx}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1"
                    >
                      {isEditing ? (
                        <input
                          value={editingTagDraft}
                          onChange={(e) => setEditingTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              commitEditTag();
                            }
                            if (e.key === "Escape") {
                              setEditingTagIdx(-1);
                              setEditingTagDraft("");
                            }
                          }}
                          onBlur={commitEditTag}
                          className="bg-transparent outline-none text-sm min-w-[6rem]"
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditTag(idx)}
                          className="text-sm text-foreground hover:underline underline-offset-2"
                          title="Clique para editar"
                        >
                          {t}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTagAt(idx)}
                        className="w-5 h-5 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-destructive/10"
                        aria-label="Remover tag"
                        title="Remover"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>


          </div>

          <div
            className={cn("space-y-4", step !== 2 && "hidden")}
            aria-hidden={step !== 2}
          >
          <div className="space-y-6">
            <section className="space-y-2 rounded-xl border border-border bg-muted/15 p-4">
              <Label>Intervalo do carrossel (s)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[carousel_interval_sec]}
                  onValueChange={(v) => setCarouselInterval(v[0])}
                  min={2}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <span className="w-10 text-sm tabular-nums">{carousel_interval_sec}s</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usado quando houver múltiplas imagens anexadas.
              </p>
            </section>

            <div
              className={cn(
                "scroll-mt-28 space-y-4",
                fieldHints.midia &&
                  "rounded-xl p-2 ring-2 ring-destructive/25 ring-offset-2 ring-offset-background",
              )}
              ref={setFieldHintAnchor("midia")}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
                <Label>Imagens e vídeo (YouTube)</Label>
                <FieldHintMessage
                  message={fieldHints.midia}
                  className="text-sm text-destructive"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Envie imagens para o carrossel, opcionalmente URLs do YouTube (como slides) e,
                se quiser, um ficheiro de áudio para música de fundo na apresentação.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {/* Secção: imagens */}
                <section className="flex flex-col gap-3 rounded-xl border border-border bg-muted/15 p-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                    <Image
                      className="h-4 w-4 shrink-0 text-muted-foreground/70"
                      aria-hidden
                    />
                    <h3 className="text-sm font-medium text-foreground">
                      Imagens
                    </h3>
                  </div>
                  <label
                    className={cn(
                      "inline-flex min-h-[2.75rem] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/5",
                      uploading || uploadAudioBusy
                        ? "pointer-events-none opacity-50"
                        : "",
                    )}
                  >
                    <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                    Enviar imagens
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAddMedia}
                      disabled={uploading || uploadAudioBusy}
                    />
                  </label>
                  <div className="min-h-[2.5rem] space-y-1">
                    {anexosComIndiceImagens.length === 0 ? (
                      <p className="text-xs text-muted-foreground/90">
                        Nenhuma imagem anexada.
                      </p>
                    ) : (
                      <ul className="max-h-36 space-y-0.5 overflow-y-auto text-sm">
                        {anexosComIndiceImagens.map(({ anexo: a, idx: i }) => (
                          <li
                            key={`img-${a?.url || "f"}-${i}`}
                            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-0"
                          >
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                              {a?.name || "Imagem"}
                            </span>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                setAnexos((arr) =>
                                  arr.filter((_, j) => j !== i),
                                )
                              }
                              aria-label={`Remover ${a?.name || "imagem"}`}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {anexosComIndiceImagens.length > 1 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground/90 transition hover:text-destructive"
                      onClick={() =>
                        setAnexos((arr) =>
                          arr.filter((x) => !isImageMime(x?.mime)),
                        )
                      }
                    >
                      <Trash2
                        className="h-3 w-3 opacity-60"
                        aria-hidden
                      />
                      Remover todas as imagens
                    </button>
                  ) : null}
                </section>

                <section className="flex flex-col gap-3 rounded-xl border border-border bg-muted/15 p-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                    <Youtube
                      className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                      aria-hidden
                    />
                    <h3 className="text-sm font-medium text-foreground">YouTube</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vários URLs são permitidos; surgem como slides depois das imagens.
                  </p>
                  <div className="space-y-2">
                    {video_urls.map((urlRow, idx) => (
                      <div
                        key={idx}
                        ref={setFieldHintAnchor(`youtube_${idx}`)}
                        className="flex scroll-mt-28 flex-col gap-1 sm:flex-row sm:items-start sm:gap-2"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <Input
                            id={idx === 0 ? "post-video-0" : undefined}
                            value={urlRow}
                            onChange={(e) => {
                              setVideoUrls((rows) =>
                                rows.map((r, i) =>
                                  i === idx ? e.target.value : r,
                                ),
                              );
                              clearFieldHint(`youtube_${idx}`);
                            }}
                            placeholder="https://www.youtube.com/watch?v=…"
                            aria-invalid={!!fieldHints[`youtube_${idx}`]}
                            className={cn(
                              "min-w-0 w-full",
                              fieldHints[`youtube_${idx}`] &&
                                "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
                            )}
                          />
                          <FieldHintMessage
                            message={fieldHints[`youtube_${idx}`]}
                            className="text-xs text-destructive"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 self-start sm:mt-0"
                          onClick={() => {
                            setVideoUrls((rows) =>
                              rows.length <= 1 ? [""] : rows.filter((_, i) => i !== idx),
                            );
                            clearFieldHint(`youtube_${idx}`);
                          }}
                          aria-label={
                            video_urls.length <= 1
                              ? "Limpar URL"
                              : `Remover linha de URL ${idx + 1}`
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={cn(
                        "inline-flex min-h-[2.75rem] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/5",
                        uploading || uploadAudioBusy
                          ? "pointer-events-none opacity-50"
                          : "",
                      )}
                      onClick={() => setVideoUrls((rows) => [...rows, ""])}
                    >
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      Adicionar URL do YouTube
                    </button>
                  </div>
                </section>

                {/* Secção: áudio */}
                <section className="flex flex-col gap-3 rounded-xl border border-border bg-muted/15 p-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                    <Headphones
                      className="h-4 w-4 shrink-0 text-muted-foreground/70"
                      aria-hidden
                    />
                    <h3 className="text-sm font-medium text-foreground">
                      Áudio
                    </h3>
                  </div>
                  <label
                    className={cn(
                      "inline-flex min-h-[2.75rem] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/5",
                      uploading || uploadAudioBusy
                        ? "pointer-events-none opacity-50"
                        : "",
                    )}
                  >
                    <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {audioAmbienteUrl.trim()
                      ? "Substituir áudio"
                      : "Enviar áudio"}
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleAddAudioAmbiente}
                      disabled={uploading || uploadAudioBusy}
                    />
                  </label>
                  {uploadAudioBusy ? (
                    <p className="text-xs text-muted-foreground">
                      A enviar áudio…
                    </p>
                  ) : null}
                  {!audioAmbienteUrl.trim() && !uploadAudioBusy ? (
                    <p className="text-xs text-muted-foreground/90">
                      Música de fundo opcional (um ficheiro).
                    </p>
                  ) : null}
                  {audioAmbienteUrl.trim() ? (
                    <div className="flex items-start gap-2 rounded-lg border border-border/80 bg-background/60 p-2">
                      <audio
                        src={audioAmbienteUrl}
                        controls
                        className="h-9 min-w-0 flex-1"
                      />
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setAudioAmbienteUrl("")}
                        aria-label="Remover áudio"
                        title="Remover áudio"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>

              {anexosComIndiceVideos.length > 0 ? (
                <section className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-4 dark:bg-amber-950/25">
                  <div className="flex flex-col gap-2 border-b border-amber-500/25 pb-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Film
                        className="h-4 w-4 shrink-0 text-amber-800 dark:text-amber-200"
                        aria-hidden
                      />
                      <h3 className="text-sm font-medium text-foreground">
                        Vídeos em ficheiro (legado)
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Esta publicação ainda tem vídeo(s) enviado(s) como ficheiro. O envio de novos
                    vídeos por ficheiro foi descontinuado — use URLs do YouTube. Pode remover os
                    ficheiros abaixo.
                  </p>
                  <ul className="max-h-36 space-y-0.5 overflow-y-auto text-sm">
                    {anexosComIndiceVideos.map(({ anexo: a, idx: i }) => (
                      <li
                        key={`vid-legacy-${a?.url || "f"}-${i}`}
                        className="flex items-center gap-2 rounded-md py-1 pl-1 pr-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {a?.name || "Vídeo"}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setAnexos((arr) => arr.filter((_, j) => j !== i))}
                          aria-label={`Remover ${a?.name || "vídeo"}`}
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {anexosComIndiceVideos.length > 1 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground/90 transition hover:text-destructive"
                      onClick={() =>
                        setAnexos((arr) =>
                          arr.filter(
                            (x) =>
                              !(
                                typeof x?.mime === "string" &&
                                x.mime.startsWith("video/")
                              ),
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3 opacity-60" aria-hidden />
                      Remover todos os vídeos em ficheiro
                    </button>
                  ) : null}
                </section>
              ) : null}

              {uploading ? (
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Upload
                      className="h-4 w-4 shrink-0 animate-pulse text-accent"
                      aria-hidden
                    />
                    A enviar imagens…
                  </div>
                  <Progress
                    value={uploadProgress}
                    className="h-2.5 w-full"
                    aria-valuenow={uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {uploadProgress}%
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            {(() => {
              const ytClean = video_urls
                .map((s) => String(s || "").trim())
                .filter(Boolean);
              const previewSlides = appendYoutubeSlidesFromUrls(
                buildSlidesFromAnexos(anexos),
                ytClean,
              );
              const diasPreview = normalizeDiasGaleria(diasGaleria);
              const showSectionsPreview =
                usarGaleriaPorDia &&
                diasPreview.some((d) => d.imagens_urls.length > 0);

              if (showSectionsPreview) {
                return (
                  <div className="space-y-2">
                    <Label>Pré-visualização — galeria por secções</Label>
                    <PostGalleryByDay
                      diasGaleria={diasGaleria}
                      anexos={anexos}
                      intervalSec={carousel_interval_sec}
                      showPresentationButton={false}
                      showMediaKindBadge
                      onRemoveSlideFromSection={removeSectionPreviewSlideAt}
                      audioAmbienteUrl=""
                      audioAmbienteEscopo="todas_secoes"
                    />
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  <Label>Pré-visualização — galeria</Label>
                  <PostImagesBlock
                    slides={previewSlides}
                    intervalSec={carousel_interval_sec}
                    showFullscreenEntry={false}
                    showMediaKindBadge
                    galleryOnly
                    audioAmbienteUrl=""
                    audioAmbienteAtivo={false}
                    starFeatured={{
                      imagemDestaqueUrl,
                      onImagemDestaqueChange: setImagemDestaqueUrl,
                    }}
                    onRemoveGallerySlide={removePreviewSlideAt}
                  />
                </div>
              );
            })()}
          </div>

          </div>

          <div
            className={cn("space-y-4", step !== 3 && "hidden")}
            aria-hidden={step !== 3}
          >
          <div
            ref={setFieldHintAnchor("galeriaGlobal")}
            className={cn(
              "space-y-3 scroll-mt-28 rounded-xl border border-border bg-muted/15 px-3 py-3",
              fieldHints.galeriaGlobal &&
                "ring-2 ring-destructive/25 border-destructive/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
                  <Label
                    htmlFor="post-galeria-por-dia"
                    className="text-sm font-medium"
                  >
                    Galeria por secções
                  </Label>
                  <FieldHintMessage
                    message={fieldHints.galeriaGlobal}
                    className="text-sm text-destructive shrink-0"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Agrupa fotos por título de secção (ex.: «Dia 1», «Cerimónia»).
                  À direita, em mosaico, ficam os ficheiros por atribuir — arraste-os
                  para cada secção. Abaixo vê a pré-visualização do resultado.
                </p>
              </div>
              <Switch
                id="post-galeria-por-dia"
                className="shrink-0"
                checked={usarGaleriaPorDia}
                onCheckedChange={(v) => {
                  const on = !!v;
                  if (!on) {
                    clearFieldHint("galeriaGlobal");
                    diasGaleria.forEach((_, i) =>
                      clearFieldHint(`secTitulo_${i}`),
                    );
                  }
                  setUsarGaleriaPorDia(on);
                  if (on && diasGaleria.length === 0) {
                    setDiasGaleria([
                      {
                        titulo: "",
                        imagens_urls: [],
                        musica_ambiente: true,
                      },
                    ]);
                  }
                }}
              />
            </div>
                      {usarGaleriaPorDia &&
                      audioAmbienteUrl.trim() &&
                      visualMediaUrlsForDias.length > 0 ? (
                        <div className="space-y-3 rounded-lg border border-border bg-background/70 p-3">
                          <div className="space-y-1">
                            <Label className="text-sm font-medium">
                              Música de fundo nas secções
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Por defeito a música acompanha todas as secções.
                              Pode restringir secção a secção abaixo.
                            </p>
                          </div>
                          <RadioGroup
                            value={audioAmbienteEscopo}
                            onValueChange={setAudioAmbienteEscopo}
                            className="grid gap-2"
                          >
                            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-1 hover:bg-muted/50">
                              <RadioGroupItem
                                value="todas_secoes"
                                id="musica-todas"
                              />
                              <span className="text-sm">
                                Todas as secções (predefinição)
                              </span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-1 hover:bg-muted/50">
                              <RadioGroupItem
                                value="por_secao"
                                id="musica-manual"
                              />
                              <span className="text-sm">
                                Escolher manualmente por secção
                              </span>
                            </label>
                          </RadioGroup>
                        </div>
                      ) : null}
                      {usarGaleriaPorDia && visualMediaUrlsForDias.length > 0 ? (
                        <DragDropContext onDragEnd={handleSecoesGaleriaDragEnd}>
                          <div className="flex flex-col gap-8 pt-1">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
                              <div className="order-2 min-w-0 flex-1 space-y-4 lg:order-1">
                            {diasGaleria.map((sec, secIdx) => (
                              <div
                                key={`sec-${secIdx}`}
                                ref={setFieldHintAnchor(`secTitulo_${secIdx}`)}
                                className="space-y-3 scroll-mt-28 rounded-lg border border-border bg-background/80 p-3"
                              >
                                <div className="flex flex-wrap items-end gap-3">
                                  <div className="min-w-[12rem] flex-1 space-y-1">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:justify-between">
                                      <Label className="text-xs">
                                        Título da secção *
                                      </Label>
                                      <FieldHintMessage
                                        message={
                                          fieldHints[`secTitulo_${secIdx}`]
                                        }
                                        className="text-xs text-destructive shrink-0"
                                      />
                                    </div>
                                    <Input
                                      value={sec.titulo}
                                      onChange={(e) => {
                                        setDiasGaleria((prev) =>
                                          prev.map((row, i) =>
                                            i === secIdx
                                              ? {
                                                  ...row,
                                                  titulo: e.target.value,
                                                }
                                              : row,
                                          ),
                                        );
                                        clearFieldHint(`secTitulo_${secIdx}`);
                                      }}
                                      placeholder="Ex.: Dia 1 — Chegada"
                                      aria-invalid={
                                        !!fieldHints[`secTitulo_${secIdx}`]
                                      }
                                      className={cn(
                                        fieldHints[`secTitulo_${secIdx}`] &&
                                          "border-destructive ring-2 ring-destructive/30 focus-visible:ring-destructive/40",
                                      )}
                                      required
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => removeDiaSectionAt(secIdx)}
                                    aria-label={`Remover secção ${secIdx + 1}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                {audioAmbienteUrl.trim() &&
                                audioAmbienteEscopo === "por_secao" ? (
                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/25 px-2 py-2">
                                    <Label
                                      htmlFor={`musica-sec-${secIdx}`}
                                      className="text-xs font-normal"
                                    >
                                      Música de fundo nesta secção
                                    </Label>
                                    <Switch
                                      id={`musica-sec-${secIdx}`}
                                      checked={sec.musica_ambiente !== false}
                                      onCheckedChange={(on) =>
                                        setDiasGaleria((prev) =>
                                          prev.map((row, i) =>
                                            i === secIdx
                                              ? {
                                                  ...row,
                                                  musica_ambiente: !!on,
                                                }
                                              : row,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                ) : null}
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Área desta secção — arraste desde «Por atribuir» ou
                                    reorganize aqui
                                  </p>
                                  <Droppable
                                    droppableId={`section-${secIdx}`}
                                    direction="horizontal"
                                  >
                                    {(dropProvided, snapshot) => (
                                      <div
                                        ref={dropProvided.innerRef}
                                        {...dropProvided.droppableProps}
                                        className={`flex min-h-[4.5rem] flex-wrap content-start gap-2 rounded-lg border border-dashed p-2 transition-colors ${
                                          snapshot.isDraggingOver
                                            ? "border-accent bg-accent/15"
                                            : "border-border bg-muted/20"
                                        }`}
                                      >
                                        {sec.imagens_urls.length === 0 &&
                                        !snapshot.isDraggingOver ? (
                                          <span className="self-center px-1 text-xs text-muted-foreground">
                                            Arraste miniaturas da zona «Por atribuir»
                                            à direita.
                                          </span>
                                        ) : null}
                                        {sec.imagens_urls.map((url, imgIdx) => (
                                          <Draggable
                                            key={galleryDragId(url)}
                                            draggableId={galleryDragId(url)}
                                            index={imgIdx}
                                          >
                                            {(dragProvided, dragSnapshot) => (
                                              <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                {...dragProvided.dragHandleProps}
                                                className={`relative h-16 w-16 shrink-0 cursor-grab touch-none overflow-hidden rounded-lg border border-border active:cursor-grabbing ${
                                                  dragSnapshot.isDragging
                                                    ? "z-10 opacity-90 shadow-lg ring-2 ring-accent"
                                                    : ""
                                                }`}
                                                title="Arrastar para outra secção ou para «Por atribuir»"
                                              >
                                                {isVideoAttachmentUrl(
                                                  anexos,
                                                  url,
                                                ) ? (
                                                  <video
                                                    src={url}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    className="pointer-events-none h-full w-full object-cover"
                                                  />
                                                ) : (
                                                  <SafeImg
                                                    src={url}
                                                    alt=""
                                                    className="pointer-events-none h-full w-full object-cover"
                                                  />
                                                )}
                                                <MediaKindCornerBadge
                                                  kind={
                                                    isVideoAttachmentUrl(
                                                      anexos,
                                                      url,
                                                    )
                                                      ? "video"
                                                      : "image"
                                                  }
                                                  size="sm"
                                                />
                                                <button
                                                  type="button"
                                                  className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-background/95 text-muted-foreground shadow hover:bg-destructive/15 hover:text-destructive"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeUrlFromDiaSection(
                                                      secIdx,
                                                      url,
                                                    );
                                                  }}
                                                  aria-label="Retirar da secção"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {dropProvided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                </div>
                              </div>
                            ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 w-fit"
                                  onClick={appendDiaSection}
                                >
                                  <Plus className="h-4 w-4" />
                                  Nova secção
                                </Button>
                              </div>

                              <div className="order-1 w-full shrink-0 lg:order-2 lg:sticky lg:top-4 lg:w-[min(22rem,40vw)] xl:max-w-sm lg:max-h-[min(75vh,calc(100vh-9rem))] lg:overflow-y-auto">
                                <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/25 p-3">
                                  <p className="text-sm font-medium text-foreground">
                                    Por atribuir
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Mosaico — use o ícone de ampliar no canto para ver a
                                    imagem ou o vídeo (YouTube / ficheiro legado) em modal.
                                    Arraste cada miniatura para uma secção; para retirar da
                                    secção, arraste de volta para aqui.
                                  </p>
                                  <Droppable
                                    droppableId="pool-unassigned"
                                    direction="vertical"
                                  >
                                    {(poolProvided, poolSnapshot) => (
                                      <div
                                        ref={poolProvided.innerRef}
                                        {...poolProvided.droppableProps}
                                        className={`grid min-h-[5rem] grid-cols-3 gap-2 rounded-lg border border-dashed p-2 sm:grid-cols-4 auto-rows-[minmax(4.25rem,auto)] ${
                                          poolSnapshot.isDraggingOver
                                            ? "border-accent bg-accent/15"
                                            : "border-border/80 bg-background/50"
                                        }`}
                                      >
                                        {unassignedImageUrls.length === 0 &&
                                        !poolSnapshot.isDraggingOver ? (
                                          <span className="col-span-full self-center px-1 py-6 text-center text-xs text-muted-foreground">
                                            Todos os ficheiros já estão nas secções —
                                            arraste para aqui para libertar.
                                          </span>
                                        ) : null}
                                        {unassignedImageUrls.map((url, ui) => (
                                          <Draggable
                                            key={galleryDragId(url)}
                                            draggableId={galleryDragId(url)}
                                            index={ui}
                                          >
                                            {(dp, ds) => (
                                              <div
                                                ref={dp.innerRef}
                                                {...dp.draggableProps}
                                                {...dp.dragHandleProps}
                                                className={`relative aspect-square min-h-[4.25rem] w-full cursor-grab touch-none overflow-hidden rounded-lg border-2 border-dashed border-border active:cursor-grabbing ${
                                                  ds.isDragging
                                                    ? "z-10 opacity-90 shadow-lg ring-2 ring-accent"
                                                    : ""
                                                }`}
                                              >
                                                {!ds.isDragging ? (
                                                  <button
                                                    type="button"
                                                    className="absolute left-0.5 top-0.5 z-20 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/95 text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    onPointerDown={(e) => {
                                                      e.stopPropagation();
                                                    }}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openAnexoPreview(url);
                                                    }}
                                                    aria-label="Ver em tamanho maior"
                                                  >
                                                    <Maximize2
                                                      className="h-3.5 w-3.5"
                                                      aria-hidden
                                                    />
                                                  </button>
                                                ) : null}
                                                {isVideoAttachmentUrl(
                                                  anexos,
                                                  url,
                                                ) ? (
                                                  <video
                                                    src={url}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    className="pointer-events-none h-full w-full object-cover"
                                                  />
                                                ) : (
                                                  <SafeImg
                                                    src={url}
                                                    alt=""
                                                    className="pointer-events-none h-full w-full object-cover"
                                                  />
                                                )}
                                                <MediaKindCornerBadge
                                                  kind={
                                                    isVideoAttachmentUrl(
                                                      anexos,
                                                      url,
                                                    )
                                                      ? "video"
                                                      : "image"
                                                  }
                                                  size="sm"
                                                />
                                              </div>
                                            )}
                                          </Draggable>
                                        ))}
                                        {poolProvided.placeholder}
                                      </div>
                                    )}
                                  </Droppable>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 border-t border-border pt-6">
                              <Label className="text-base">
                                Pré-visualização — como ficará a publicação
                              </Label>
                              {normalizeDiasGaleria(diasGaleria).some(
                                (d) => d.imagens_urls.length > 0,
                              ) ? (
                                <PostGalleryByDay
                                  diasGaleria={diasGaleria}
                                  anexos={anexos}
                                  intervalSec={carousel_interval_sec}
                                  showPresentationButton={false}
                                  showMediaKindBadge
                                  onRemoveSlideFromSection={
                                    removeSectionPreviewSlideAt
                                  }
                                  audioAmbienteUrl=""
                                  audioAmbienteEscopo="todas_secoes"
                                />
                              ) : (
                                <div className="rounded-xl border border-dashed border-border bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
                                  Coloque imagens nas secções para ver o resultado aqui (ou
                                  volte ao «Por atribuir» se ainda não distribuiu os
                                  ficheiros).
                                </div>
                              )}
                            </div>
                          </div>
                        </DragDropContext>
                      ) : usarGaleriaPorDia ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          Adicione imagens ou URLs do YouTube na etapa 2 para poder atribuí-los
                          às secções.
                        </p>
                      ) : null}
          </div>
          </div>

          <div
            className={cn("space-y-4", step !== 4 && "hidden")}
            aria-hidden={step !== 4}
          >
              {anexos.length > 0 ? (
                <div className="w-full min-w-0 space-y-2 rounded-xl border border-border bg-muted/20 px-3 py-3">
                  <Label>Ordem dos anexos</Label>
                  <p className="text-xs text-muted-foreground">
                    {usarGaleriaPorDia ? (
                      <>
                        Galeria por secções: cada grupo corresponde a uma secção na
                        publicação. A ordem das miniaturas dentro do grupo é a ordem da
                        apresentação nessa parte. Arraste entre secções ou desde «Por
                        atribuir». A estrela (foto ou vídeo) define a miniatura na lista de
                        publicações; sem estrela, usa a 1.ª imagem.
                      </>
                    ) : (
                      <>
                        Mosaico em grelha: <strong className="font-medium text-foreground">
                          {ANEXO_ORDER_MOSAIC_COLS} miniaturas por linha
                        </strong>
                        ; a linha seguinte continua a ordem do carrossel. Arraste o bloco
                        da imagem ou use o ícone de ampliar para ver em tamanho maior.
                      </>
                    )}
                  </p>
                  {usarGaleriaPorDia ? (
                    <DragDropContext onDragEnd={handleSecoesGaleriaDragEnd}>
                      <div className="space-y-8">
                        {normalizeDiasGaleria(diasGaleria).map((sec, secIdx) => (
                          <section
                            key={`ordem-sec-${secIdx}`}
                            className="space-y-2"
                          >
                            <h3 className="border-b border-border pb-1 text-sm font-semibold tracking-tight text-foreground">
                              {formatSecaoGaleriaHeading(sec, secIdx)}
                            </h3>
                            <Droppable
                              droppableId={`section-${secIdx}`}
                              direction="horizontal"
                            >
                              {(dropProvided, snapshot) => (
                                <div
                                  ref={dropProvided.innerRef}
                                  {...dropProvided.droppableProps}
                                  className={`flex min-h-[5.5rem] flex-wrap content-start gap-2 rounded-lg border border-dashed p-2 transition-colors ${
                                    snapshot.isDraggingOver
                                      ? "border-accent bg-accent/10"
                                      : "border-border bg-muted/15"
                                  }`}
                                >
                                  {sec.imagens_urls.length === 0 &&
                                  !snapshot.isDraggingOver ? (
                                    <span className="px-1 py-2 text-xs text-muted-foreground">
                                      Vazio — arraste desde «Por atribuir» abaixo ou a
                                      partir de outra secção.
                                    </span>
                                  ) : null}
                                  {sec.imagens_urls.map((url, urlIdx) => {
                                    const a = anexos.find((x) => x?.url === url);
                                    const index = anexos.findIndex(
                                      (x) => x?.url === url,
                                    );
                                    const isImg =
                                      a && isImageMime(a.mime) && a.url;
                                    const isVideo =
                                      a &&
                                      typeof a.mime === "string" &&
                                      a.mime.startsWith("video/") &&
                                      a.url;
                                    const firstImageUrl =
                                      imageUrlsForFeatured[0] || "";
                                    const explicit = String(
                                      imagemDestaqueUrl || "",
                                    ).trim();
                                    const featuredRing =
                                      (explicit && explicit === a.url) ||
                                      (!explicit &&
                                        isImg &&
                                        a.url === firstImageUrl);
                                    return (
                                      <Draggable
                                        key={`ord-${secIdx}-${urlIdx}-${galleryDragId(url)}`}
                                        draggableId={galleryDragId(url)}
                                        index={urlIdx}
                                      >
                                        {(dragProvided, snapshot) => (
                                          <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                            className={`relative h-24 w-24 shrink-0 cursor-grab touch-none overflow-hidden rounded-xl border bg-muted/30 outline-none transition-[box-shadow,ring,opacity] active:cursor-grabbing sm:h-28 sm:w-28 md:h-32 md:w-32 ${
                                              snapshot.isDragging
                                                ? "z-10 opacity-90 shadow-lg ring-2 ring-accent"
                                                : ""
                                            } ${
                                              featuredRing
                                                ? "ring-2 ring-amber-400 shadow-md"
                                                : "border-border"
                                            }`}
                                          >
                                            {(isImg || isVideo) ? (
                                              <AnexoPreviewOpenButton
                                                className="absolute left-1 top-1 z-[30]"
                                                onClick={() => openAnexoPreview(url)}
                                              />
                                            ) : null}
                                            <button
                                              type="button"
                                              className="absolute left-1 bottom-1 z-[35] flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/95 text-destructive shadow-sm transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                              onPointerDown={(e) =>
                                                e.stopPropagation()
                                              }
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeAnexoByUrl(url);
                                              }}
                                              aria-label={`Remover ${a?.name || "ficheiro"}`}
                                            >
                                              <Trash2
                                                className="h-4 w-4 shrink-0"
                                                strokeWidth={2}
                                                aria-hidden
                                              />
                                            </button>
                                            {isImg ? (
                                              <>
                                                <GalleryFeaturedStar
                                                  src={a.url}
                                                  starCtl={{
                                                    value: imagemDestaqueUrl,
                                                    onChange: setImagemDestaqueUrl,
                                                  }}
                                                  defaultThumbUrl={firstImageUrl}
                                                />
                                                <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
                                                  <SafeImg
                                                    src={a.url}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                  />
                                                </div>
                                                <MediaKindCornerBadge kind="image" />
                                              </>
                                            ) : isVideo ? (
                                              <>
                                                <GalleryFeaturedStar
                                                  src={a.url}
                                                  starCtl={{
                                                    value: imagemDestaqueUrl,
                                                    onChange: setImagemDestaqueUrl,
                                                  }}
                                                  defaultThumbUrl={firstImageUrl}
                                                />
                                                <video
                                                  src={a.url}
                                                  muted
                                                  playsInline
                                                  preload="metadata"
                                                  className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
                                                />
                                                <MediaKindCornerBadge kind="video" />
                                              </>
                                            ) : (
                                              <>
                                                <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/50 px-1 pt-7 text-center">
                                                  <Film
                                                    className="h-8 w-8 shrink-0 text-muted-foreground"
                                                    aria-hidden
                                                  />
                                                  <span className="line-clamp-2 w-full text-[10px] text-muted-foreground">
                                                    {a?.name ||
                                                      `Vídeo ${urlIdx + 1}`}
                                                  </span>
                                                </div>
                                                <MediaKindCornerBadge kind="video" />
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {dropProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </section>
                        ))}
                        {unassignedImageUrls.length > 0 ? (
                          <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/25 p-3">
                            <p className="text-sm font-medium text-foreground">
                              Por atribuir
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ainda não estão numa secção — arraste para um grupo acima.
                            </p>
                            <Droppable
                              droppableId="pool-unassigned"
                              direction="horizontal"
                            >
                              {(poolProvided, poolSnapshot) => (
                                <div
                                  ref={poolProvided.innerRef}
                                  {...poolProvided.droppableProps}
                                  className={`flex min-h-[4.5rem] flex-wrap content-start gap-2 rounded-lg border border-dashed p-2 ${
                                    poolSnapshot.isDraggingOver
                                      ? "border-accent bg-accent/15"
                                      : "border-border/80 bg-background/50"
                                  }`}
                                >
                                  {unassignedImageUrls.map((url, ui) => (
                                    <Draggable
                                      key={`pool-step4-${ui}-${galleryDragId(url)}`}
                                      draggableId={galleryDragId(url)}
                                      index={ui}
                                    >
                                      {(dp, ds) => (
                                        <div
                                          ref={dp.innerRef}
                                          {...dp.draggableProps}
                                          {...dp.dragHandleProps}
                                          className={`relative h-16 w-16 shrink-0 cursor-grab touch-none overflow-hidden rounded-lg border-2 border-dashed border-border active:cursor-grabbing sm:h-20 sm:w-20 ${
                                            ds.isDragging
                                              ? "z-10 opacity-90 shadow-lg ring-2 ring-accent"
                                              : ""
                                          }`}
                                        >
                                          <AnexoPreviewOpenButton
                                            size="sm"
                                            className="absolute left-0.5 top-0.5 z-[30]"
                                            onClick={() => openAnexoPreview(url)}
                                          />
                                          <button
                                            type="button"
                                            className="absolute left-0.5 bottom-0.5 z-[35] flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border bg-background/95 text-destructive shadow-sm transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            onPointerDown={(e) =>
                                              e.stopPropagation()
                                            }
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              removeAnexoByUrl(url);
                                            }}
                                            aria-label="Remover ficheiro"
                                          >
                                            <Trash2
                                              className="h-3.5 w-3.5 shrink-0"
                                              strokeWidth={2}
                                              aria-hidden
                                            />
                                          </button>
                                          {isVideoAttachmentUrl(anexos, url) ? (
                                            <video
                                              src={url}
                                              muted
                                              playsInline
                                              preload="metadata"
                                              className="pointer-events-none h-full w-full object-cover"
                                            />
                                          ) : (
                                            <SafeImg
                                              src={url}
                                              alt=""
                                              className="pointer-events-none h-full w-full object-cover"
                                            />
                                          )}
                                          <MediaKindCornerBadge
                                            kind={
                                              isVideoAttachmentUrl(anexos, url)
                                                ? "video"
                                                : "image"
                                            }
                                            size="sm"
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {poolProvided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        ) : null}
                      </div>
                    </DragDropContext>
                  ) : anexos.length > 1 ? (
                    <AnexoOrderMosaicDnd
                      anexos={anexos}
                      onReorderAnexos={(next) => setAnexos(next)}
                      imagemDestaqueUrl={imagemDestaqueUrl}
                      setImagemDestaqueUrl={setImagemDestaqueUrl}
                      imageUrlsForFeatured={imageUrlsForFeatured}
                      onRemoveAt={(idx) => {
                        const url = anexos[idx]?.url;
                        if (url) removeAnexoByUrl(url);
                      }}
                      onPreviewAt={(idx) => {
                        const url = anexos[idx]?.url;
                        if (url) openAnexoPreview(url);
                      }}
                    />
                  ) : (
                    <div
                      className="flex w-full min-w-0 flex-wrap content-start gap-2 pb-2"
                      style={{
                        ["--anexo-mosaic-cell"]: ANEXO_ORDER_MOSAIC_CELL,
                      }}
                    >
                      {(() => {
                        const a = anexos[0];
                        const isImg =
                          a && isImageMime(a.mime) && a.url;
                        const isVideo =
                          a &&
                          typeof a.mime === "string" &&
                          a.mime.startsWith("video/") &&
                          a.url;
                        const firstImageUrl = imageUrlsForFeatured[0] || "";
                        const explicit = String(
                          imagemDestaqueUrl || "",
                        ).trim();
                        const featuredRing =
                          (explicit && explicit === a.url) ||
                          (!explicit && isImg && a.url === firstImageUrl);
                        return (
                          <div
                            style={{
                              flex: "0 0 var(--anexo-mosaic-cell)",
                              width: "var(--anexo-mosaic-cell)",
                              maxWidth: "var(--anexo-mosaic-cell)",
                            }}
                            className={`relative aspect-square min-w-0 overflow-hidden rounded-xl border bg-muted/30 ${
                              featuredRing
                                ? "ring-2 ring-amber-400 shadow-md"
                                : "border-border"
                            }`}
                          >
                            {(isImg || isVideo) ? (
                              <AnexoPreviewOpenButton
                                className="absolute left-1 top-1 z-[30]"
                                onClick={() => openAnexoPreview(a.url)}
                              />
                            ) : null}
                            <button
                              type="button"
                              className="absolute left-1 bottom-1 z-[35] flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/95 text-destructive shadow-sm transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => {
                                if (a?.url) removeAnexoByUrl(a.url);
                              }}
                              aria-label="Remover ficheiro"
                            >
                              <Trash2
                                className="h-4 w-4 shrink-0"
                                strokeWidth={2}
                                aria-hidden
                              />
                            </button>
                            {isImg ? (
                              <>
                                <GalleryFeaturedStar
                                  src={a.url}
                                  starCtl={{
                                    value: imagemDestaqueUrl,
                                    onChange: setImagemDestaqueUrl,
                                  }}
                                  defaultThumbUrl={firstImageUrl}
                                />
                                <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
                                  <SafeImg
                                    src={a.url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <MediaKindCornerBadge kind="image" />
                              </>
                            ) : isVideo ? (
                              <>
                                <GalleryFeaturedStar
                                  src={a.url}
                                  starCtl={{
                                    value: imagemDestaqueUrl,
                                    onChange: setImagemDestaqueUrl,
                                  }}
                                  defaultThumbUrl={firstImageUrl}
                                />
                                <video
                                  src={a.url}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
                                />
                                <MediaKindCornerBadge kind="video" />
                              </>
                            ) : (
                              <>
                                <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/50 px-1 pt-7 text-center">
                                  <Film
                                    className="h-8 w-8 shrink-0 text-muted-foreground"
                                    aria-hidden
                                  />
                                  <span className="line-clamp-2 w-full text-[10px] text-muted-foreground">
                                    {a?.name || "Vídeo"}
                                  </span>
                                </div>
                                <MediaKindCornerBadge kind="video" />
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Não há ficheiros de imagem para ordenar (por exemplo só indicou URL do
                  YouTube na etapa 2). Se anexar imagens, voltará aqui para definir ordem e
                  miniatura de destaque.
                </p>
              )}
          </div>
        </div>

          <div
            className={cn("space-y-6", step !== 5 && "hidden")}
            aria-hidden={step !== 5}
          >
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
              <h2 className="text-lg font-semibold text-foreground">
                Pré-visualização final
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Assim ficará a publicação. A música de fundo não toca neste ecrã —
                apenas na página do post depois de publicar.
              </p>
            </div>

            <section
              aria-labelledby="visibility-heading"
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="mb-3">
                <h3
                  id="visibility-heading"
                  className="text-base font-semibold text-foreground"
                >
                  Visibilidade
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quem pode encontrar e abrir esta postagem depois de publicada.
                </p>
              </div>
              <RadioGroup
                value={visibility}
                onValueChange={(v) =>
                  setVisibility(
                    v === "private" || v === "unlisted" ? v : "public",
                  )
                }
                className="grid gap-2 sm:grid-cols-3"
              >
                <label
                  htmlFor="visibility-public"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40",
                    visibility === "public"
                      ? "border-accent bg-accent/5"
                      : "border-border",
                  )}
                >
                  <RadioGroupItem
                    id="visibility-public"
                    value="public"
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Globe className="h-4 w-4" aria-hidden /> Pública
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Aparece na lista de Posts e fica acessível a qualquer
                      pessoa.
                    </span>
                  </span>
                </label>

                <label
                  htmlFor="visibility-unlisted"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40",
                    visibility === "unlisted"
                      ? "border-accent bg-accent/5"
                      : "border-border",
                  )}
                >
                  <RadioGroupItem
                    id="visibility-unlisted"
                    value="unlisted"
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Link2 className="h-4 w-4" aria-hidden /> Não-listado
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Não aparece na listagem; só quem tiver o link consegue
                      abrir.
                    </span>
                  </span>
                </label>

                <label
                  htmlFor="visibility-private"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40",
                    visibility === "private"
                      ? "border-accent bg-accent/5"
                      : "border-border",
                  )}
                >
                  <RadioGroupItem
                    id="visibility-private"
                    value="private"
                    className="mt-0.5"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Lock className="h-4 w-4" aria-hidden /> Privada
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Apenas o autor e administradores conseguem abrir.
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </section>

            <article className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <header className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {titulo.trim() || "Sem título"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Data da publicação: {previewPubLabel}
                </p>
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <Badge key={normalizeTagKey(t)} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </header>
              {descricao.trim() ? (
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {descricao}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Sem descrição.
                </p>
              )}

              <div className="border-t border-border pt-6">
                <PostMedia
                  anexos={anexos}
                  video_url={videoUrlsCleanPreview[0] || ""}
                  video_urls={videoUrlsCleanPreview}
                  intervalSec={carousel_interval_sec}
                  usarGaleriaPorDia={usarGaleriaPorDia}
                  diasGaleria={normalizeDiasGaleria(diasGaleria)}
                  audioAmbienteUrl=""
                  audioAmbienteEscopo="todas_secoes"
                  showPresentationButton={false}
                />
              </div>

              {audioAmbienteUrl.trim() ? (
                <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                  Ficheiro de áudio incluído — a reprodução em segundo plano só estará
                  ativa na página publicada.
                </p>
              ) : null}
            </article>
          </div>

        {step >= 1 ? (
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={() => {
                  setError("");
                  clearAllFieldHints();
                  setStep((s) => Math.max(1, s - 1));
                }}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                Etapa anterior
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() =>
                navigate(
                  categoria
                    ? `/Posts/categoria/${categoria}`
                    : "/Posts",
                )
              }
            >
              Cancelar
            </Button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            {step === 1 ? (
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 sm:w-auto"
                onClick={goToStep2}
              >
                Continuar
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            ) : step === 2 ? (
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 sm:w-auto"
                onClick={goToStep3}
              >
                Continuar
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            ) : step === 3 ? (
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 sm:w-auto"
                onClick={goToStep4}
              >
                Continuar
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            ) : step === 4 ? (
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 sm:w-auto"
                onClick={goToStep5}
              >
                Continuar
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            ) : step === 5 ? (
              <Button
                type="button"
                variant="success"
                className="w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={uploading || saving}
              >
                {isEditMode ? "Salvar" : "Publicar"}
              </Button>
            ) : null}
          </div>
        </div>
        ) : null}

        <EditorAnexoSlidesPreviewDialog
          slides={anexoPreviewSlides}
          previewIndex={anexoPreviewIndex}
          onPreviewIndexChange={setAnexoPreviewIndex}
        />
      </section>
    </div>
  );
}