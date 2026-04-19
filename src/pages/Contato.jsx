import { useState } from "react";

import { api } from "@/api/client";
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
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "../components/shared/PageHeader";

const assuntoLabels = {
  oracao: "Pedido de Oração",
  visita: "Solicitar Visita",
  informacao: "Informações",
  voluntario: "Quero Ser Voluntário",
  outro: "Outro Assunto",
};

export default function Contato() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    assunto: "",
    mensagem: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    await api.entities.Contato.create(form);
    setSending(false);
    setSent(true);
    setForm({ nome: "", email: "", telefone: "", assunto: "", mensagem: "" });
  };

  return (
    <div>
      <PageHeader
        pageKey="contato"
        tag="Fale conosco"
        title="Entre em Contato"
        description="Estamos aqui para ouvir você. Envie sua mensagem ou venha nos visitar."
      />

      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-6">
                  Informações
                </h3>
                <div className="space-y-5">
                  {[
                    {
                      icon: MapPin,
                      label: "Endereço",
                      value: "Rua Exemplo, 123\nCentro — Cidade, UF",
                    },
                    { icon: Phone, label: "Telefone", value: "(11) 1234-5678" },
                    {
                      icon: Mail,
                      label: "Email",
                      value: "contato@igrejamodelo.com",
                    },
                    {
                      icon: Clock,
                      label: "Secretaria",
                      value: "Segunda a Sexta\n9h às 17h",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              {sent ? (
                <div className="bg-card rounded-2xl border border-border p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-foreground mb-2">
                    Mensagem enviada!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Obrigado pelo contato. Responderemos em breve.
                  </p>
                  <Button
                    onClick={() => setSent(false)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Enviar outra mensagem
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="bg-card rounded-2xl border border-border p-8 space-y-5"
                >
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={form.nome}
                        onChange={(e) =>
                          setForm({ ...form, nome: e.target.value })
                        }
                        placeholder="Seu nome completo"
                        required
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="seu@email.com"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={form.telefone}
                        onChange={(e) =>
                          setForm({ ...form, telefone: e.target.value })
                        }
                        placeholder="(11) 99999-9999"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assunto">Assunto</Label>
                      <Select
                        value={form.assunto}
                        onValueChange={(value) =>
                          setForm({ ...form, assunto: value })
                        }
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione o assunto" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(assuntoLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mensagem">Mensagem *</Label>
                    <Textarea
                      id="mensagem"
                      value={form.mensagem}
                      onChange={(e) =>
                        setForm({ ...form, mensagem: e.target.value })
                      }
                      placeholder="Escreva sua mensagem..."
                      required
                      rows={5}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 rounded-xl px-8 h-11"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Enviar Mensagem
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
