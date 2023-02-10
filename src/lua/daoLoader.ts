
import { LuaModule, LuaDao } from "./types";

const readonly = true;

export function loadDao(mod: LuaModule): LuaDao | undefined {

    let t = mod["."];
    if (!t) {return;}

    let name = "";
    let desc = "";
    let $file: string = mod["$file"] || "";

    if (typeof t["table_name"] === "string") {
        name = t["table_name"];
    }

    if (typeof t["table_desc"] === "string") {
        desc = t["table_desc"];
    }

    let dao: LuaDao = { name, desc, doc: "", fields: [], row : {}, $file: mod.$file };

    let fields: any = t["field_list"];
    fields = fields && fields["."];

    if (fields instanceof Object) {
        Object.keys(fields).forEach(k=>{

            let f = fields[k];

            let $loc = f["$loc"];

                f = f && f["."];
            if (f instanceof Object) {
                f = {
                    name: f["name"] || f[1] || "",
                    desc: f["desc"] || f[2] || "",
                    type: f["type"] || f[3] || "varchar",
                    len : f["len"],
                    pk  : !!f["pk"], // 主键
                    $loc, $file
                };

                // 将数据库字段类型转换成 lua 数据类型
                let type = f.type === "varchar"       ? "string"
                         : f.type === "text"          ? "string"
                         : f.type === "date"          ? "string"
                         : f.type === "datetime"      ? "string"
                         : f.type === "boolean"       ? "boolean"
                         : f.type === "money"         ? "number"
                         : f.type.includes("int")     ? "number"
                         : f.type.includes("long")    ? "number"
                         : f.type.includes("double")  ? "number"
                         : "string";

                dao.fields.push(f);

                let pkStr = f.pk && " `(主键)`" || "";
                let fLen = f.len ? "(" + f.len + ")" : "";

                // markdown 文档提示内容
                let doc = "## " + f.name + "\n\n"
                        + "`< " + type + " >`" + " `" + f.type + fLen + "`" + "\n\n"
                        + "### " + f.desc + pkStr + "\n\n"
                        + "[" + name + "](file:"+ $file +")"
                        + " ( " + desc + " ) " ;

                dao.row[f.name] = { doc, type, $loc, $file, readonly };
            }

        });
    }

    let docs = [
        "",
        "### " + "[" + name + "](file:"+ $file +")" + " ( " + desc + " ) " ,
    ];

    dao.fields.forEach(f=>{
        let pkStr = f.pk && " `(主键)`" || "";
        docs.push("* " + f.name + " ( " + f.desc + " )" + pkStr);
    });

    dao.doc = docs.join("\n");

    // console.log(dao);
    return dao;

}
