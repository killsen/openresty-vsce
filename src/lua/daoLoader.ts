
import { LuaModule, LuaDao } from "./types";

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
                    pk : !!f["pk"], // 主键
                    $loc, $file
                };

                dao.fields.push(f);

                let pkStr = f.pk && " `(主键)`" || "";

                // markdown 文档提示内容
                let doc = "## " + f.name + "\n\n"
                        + "`< " + f.type + " >`" + "\n\n"
                        + "### " + f.desc + pkStr + "\n\n"
                        + "[" + name + "](file:"+ $file +")"
                        + " ( " + desc + " ) " ;

                dao.row[f.name] = { doc, $loc, $file };
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
