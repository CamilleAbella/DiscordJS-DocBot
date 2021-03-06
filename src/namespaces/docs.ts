import * as core from "../app/core"
import * as docs from "ghom-djs-docs"
import discord from "discord.js"
import users from "../tables/users"

export interface Lib {
  name: string
  displayName: string
  color: string
  image: string
  github: string
  docs: string
  sourceNames: docs.SourceName[]
}

export const libs: Lib[] = [
  {
    color: "BLURPLE",
    name: "discord.js",
    image:
      "https://raw.githubusercontent.com/CamilleAbella/djs-docs-bot/master/assets/discord.js.png",
    displayName: "Discord JS",
    github: "https://github.com/discordjs/discord.js",
    docs: "https://discord.js.org/#/docs/main/stable/general/welcome",
    sourceNames: ["stable", "master"],
  },
  {
    color: "BLURPLE",
    name: "discord.js-commando",
    image:
      "https://raw.githubusercontent.com/CamilleAbella/djs-docs-bot/master/assets/discord.js.png",
    displayName: "Discord JS Commando",
    github: "https://github.com/discordjs/Commando",
    docs: "https://discord.js.org/#/docs/commando/master/general/welcome",
    sourceNames: ["commando"],
  },
  {
    color: "BLURPLE",
    name: "discord-rpc",
    image:
      "https://raw.githubusercontent.com/CamilleAbella/djs-docs-bot/master/assets/discord.js.png",
    displayName: "Discord RPC",
    github: "https://github.com/discordjs/RPC",
    docs: "https://discord.js.org/#/docs/rpc/master/general/welcome",
    sourceNames: ["rpc"],
  },
  {
    color: "#87202F",
    name: "discord-akairo",
    image:
      "https://raw.githubusercontent.com/CamilleAbella/djs-docs-bot/master/assets/discord-akairo.png",
    displayName: "Discord Akairo",
    github: "https://github.com/discord-akairo/discord-akairo",
    docs: "https://discord-akairo.github.io/#/docs/main/master/class/AkairoClient",
    sourceNames: ["akairo"],
  },
  {
    color: "BLURPLE",
    name: "@discordjs/collection",
    image:
      "https://raw.githubusercontent.com/CamilleAbella/djs-docs-bot/master/assets/discord.js.png",
    displayName: "Discord Collections",
    github: "https://github.com/discordjs/collection",
    docs: "https://discord.js.org/#/docs/collection/master/general/welcome",
    sourceNames: ["collection"],
  },
]

export async function docEmbed(
  sourceName: docs.SourceName,
  e: docs.SearchResult
): Promise<discord.MessageEmbed> {
  const deprecated = "<:deprecated:835820600068800553>"
  const embed = new discord.MessageEmbed()
  const lib = getLib(sourceName)

  if (!e)
    return embed
      .setColor("RED")
      .setAuthor("404: Element not found", lib.image)
      .setDescription("Maybe try an other path")

  const url = docs.buildURL(sourceName, e)

  let description = docs.removeXMLTags(e.description ?? "No description.")
  let authorName = docs.shortBreadcrumb(e)
  let noNeedProps = false

  embed.setColor(lib.color)

  const raw = docs.cache.get(sourceName) as docs.Raw

  if (docs.isProp(raw, e)) {
    const type = docs.flatTypeDescription(e.type)
    description += core.code.stringify({
      lang: "ts",
      format: { printWidth: 40 },
      content: `class ${e.parent?.name ?? "Parent"} { ${e.access ?? ""} ${
        e.readonly ? "readonly" : ""
      } ${e.name}: ${type === "function" ? "Function" : type} }`,
    })
  } else if (docs.isClass(raw, e)) {
    description += core.code.stringify({
      lang: "ts",
      format: {
        printWidth: 40,
      },
      content: `class ${e.construct?.name ?? e.name} ${
        e.extends ? `extends ${docs.flatTypeDescription(e.extends)} ` : ""
      }{${
        e.construct ? `constructor(${paramsToString(e.construct.params)})` : ""
      }}`,
    })
  } else if (docs.isEvent(raw, e)) {
    description += core.code.stringify({
      lang: "ts",
      format: {
        printWidth: 40,
      },
      content: `interface EventEmitter { on(event: "${
        e.name
      }", fn: (${paramsToString(e.params)}) => void): this;}`,
    })
  } else if (docs.isExternal(raw, e)) {
    authorName += " (external)"
  } else if (docs.isMethod(raw, e)) {
    authorName += "()"
    description += core.code.stringify({
      lang: "ts",
      format: { printWidth: 40 },
      content: `${e.abstract ? "abstract" : ""} ${e.access ?? ""} ${
        e.async ? "async" : ""
      } function ${e.name}(${paramsToString(e.params)}): ${
        e.returns
          ? docs.flatTypeDescription(e.returns)
          : e.async
          ? "Promise<void>"
          : "void"
      }`,
    })

    if (e.returnsDescription)
      embed.addField("Returns", docs.removeXMLTags(e.returnsDescription), false)
    else if (e.returns) {
      if ("description" in e.returns && e.returns.description) {
        embed.addField(
          "Returns",
          docs.removeXMLTags(e.returns.description),
          false
        )
      }
    }
  } else if (docs.isInterface(raw, e) || docs.isTypedef(raw, e)) {
    noNeedProps = true
    description += core.code.stringify({
      lang: "ts",
      format: { printWidth: 40 },
      content: `interface ${e.name} { ${
        e.props
          ?.map((prop) => {
            return `${prop.name}${
              prop.nullable || prop.default ? "?" : ""
            }: ${docs.flatTypeDescription(prop.type)}`
          })
          .join(",") ?? ""
      } }`,
    })
  } else {
    const types = docs.flatTypeDescription(e.type).split(" | ")
    for (const type of types) {
      const E = await docs.search(raw, type)
      if (E) return docEmbed(sourceName, E)
    }
  }

  for (const key of ["props", "methods", "events"]) {
    if (key === "props" && noNeedProps) continue

    // @ts-ignore
    if (key in e && e[key]) {
      embed.addField(
        key,
        // @ts-ignore
        e[key]
          .map((item: docs.Prop | docs.Method | docs.Event) => {
            return `${item.deprecated ? "~~" : ""}${item.name}${
              item.deprecated ? "~~" : ""
            } ${item.deprecated ? deprecated : ""}`
          })
          .join("\n"),
        true
      )
    }
  }

  if ("meta" in e && e.meta)
    embed.setFooter(`${e.meta.path}/${e.meta.file} - line: ${e.meta.line}`)

  if ("deprecated" in e && e.deprecated) {
    embed.setColor("#FFACAC")
    embed.setFooter(
      "This element is deprecated!",
      "https://raw.githubusercontent.com/CamilleAbella/djs-docs-bot/master/assets/deprecated.png"
    )
  }

  return embed
    .setAuthor(authorName, lib.image, url ?? undefined)
    .setDescription(description)
}

export function getLib(sourceName: docs.SourceName): Lib {
  return libs.find((lib) => lib.sourceNames.includes(sourceName)) as Lib
}

export async function getUserSourceName(
  user: discord.User
): Promise<docs.SourceName> {
  const data = await users.query
    .select("sourceName")
    .where("id", user.id)
    .first()

  return data?.sourceName ?? "stable"
}

export function paramsToString(params?: docs.Param[]): string {
  return params
    ? params
        .map((param, i, all) => {
          if (docs.flatTypeDescription(param.type) === "Object") {
            return `${param.name}${param.optional ? "?" : ""}: {${all
              .slice(i + 1)
              .filter((p) => p.name.startsWith(param.name))
              .map((p) =>
                paramToString(p, p.name.slice(p.name.indexOf(".") + 1))
              )
              .join(",")}}`
          }
          if (param.name.includes(".")) return ""
          return paramToString(param)
        })
        .filter((line) => line.length > 0)
        .join(", ")
    : ""
}

export function paramToString(param: docs.Param, name = param.name): string {
  return `${name}${param.optional ? "?" : ""}: ${docs.flatTypeDescription(
    param.type
  )}${defaultToString(param.default)}`
}

export function defaultToString(def: any): string {
  return def !== undefined ? ` = ${def}` : ""
}
