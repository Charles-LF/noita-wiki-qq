//                   _ooOoo_
//                  o8888888o
//                  88" . "88
//                  (| o_0 |)
//                  O\  =  /O
//               ____/`---'\____
//             .'  \\|     |//  `.
//            /  \\|||  :  |||//  \
//           /  _||||| -:- |||||-  \
//           |   | \\\  -  /// |   |
//           | \_|  ''\---/''  |   |
//           \  .-\__  `-`  ___/-. /
//         ___`. .'  /--.--\  `. . __
//      ."" '<  `.___\_<|>_/___.'  >'"".
//     | | :  `- \`.;`\ _ /`;.`/ - ` : | |
//     \  \ `-.   \_ __\ /__ _/   .-` /  /
//======`-.____`-.___\_____/___.-`____.-'======
//                   `=---='
//
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                  南无加特林菩萨
//          菩提本无树           明镜亦非台
//          本来无BUG            何必常修改
//                  佛曰: 能跑就行

import { Context, Schema } from "koishi";
import Puppeteer from "koishi-plugin-puppeteer";
import * as lib from "./lib";
import fs from "fs";

export const inject = ["puppeteer"];
export const name = "noita-wiki-qq";
export const usage = `这是个noita.wiki.gg的测试插件
  更新日志: 
    0.0.1 初始化
`;

export interface Config {
  API: string;
  imgLocalPath: string;
  imgPublicPath: string;
}

export const Config: Schema<Config> = Schema.object({
  API: Schema.string()
    .description("API地址")
    .default("https://noita.wiki.gg/zh/api.php"),
  imgLocalPath: Schema.string().description("图片保存路径"),
  imgPublicPath: Schema.string()
    .description("图片公网路径")
    .default(`https://test.com/`),
});

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger("noita-wiki-qq");
  ctx
    // 指令注册
    .command("wiki <itemName:string>", "wiki查询")
    // .option("update", "-u 更新本地缓存", { authority: 2 })
    .option("delete", "-d 删除本地缓存", { authority: 2 })
    // .option("rename", "-r <newName> 重命名本地缓存", { authority: 2 })
    .action(async ({ session, options }, itemName = "分裂弹") => {
      const filePath =
        config.imgLocalPath +
        itemName.replace(/\//g, "-").replace(/:/g, "-").replace(/'/g, "-") +
        ".jpeg";
      const publicPath =
        config.imgPublicPath +
        itemName.replace(/\//g, "-").replace(/:/g, "-").replace(/'/g, "-") +
        ".jpeg";
      // 子指令处理
      // if (options.update) {
      //   let url = "https://noita.wiki.gg/zh/wiki/" + encodeURI(itemName);
      //   await lib.screenShot(url, ctx, itemName, config);
      //   return `已尝试为您更新${itemName}的缓存...}`;
      // }
      if (options.delete) {
        let filePath = config.imgLocalPath + itemName + ".jpeg";
        if (lib.checkFileExists(filePath)) {
          fs.unlinkSync(filePath);
          return `已尝试删除${itemName}的缓存...`;
        } else {
          return `文件不存在...`;
        }
      }
      // if (options.rename) {
      //   if (lib.checkFileExists(filePath)) {
      //     fs.renameSync(
      //       filePath,
      //       config.imgLocalPath + options.rename + ".jpeg"
      //     );
      //     return `已尝试重命名文件...`;
      //   } else {
      //     return `文件不存在...`;
      //   }
      // }

      // 主流程
      session.send(`本轮查询开始,请等待API结果返回...`);
      // 等待 1s 免得消息乱序
      await lib.delay(1000);

      //判断文件是否在本地有缓存
      if (lib.checkFileExists(filePath)) {
        // 在, 直接发送 或者以MD发送(
        return `文件缓存已命中，缓存时间为：${lib.getFileModifyTime(
          filePath
        )} 请前往以下网址查看:${
          config.imgPublicPath +
          itemName.replace(/\//g, "-").replace(/:/g, "-").replace(/'/g, "-")
        }.jpeg)}`;
      } else {
        // 不在,请求API
        const res = await lib.getFromWikigg(config.API, ctx, itemName);
        if (res.length == 0) {
          return `在wiki内未找到${itemName},或网络超时`;
        } else {
          const title = [...res[0]];
          const res_url = [...res[1]];
          logger.info(`API返回结果:${title}`);

          if (title[0] == itemName) {
            let res: boolean = await lib.screenShot(
              res_url[0],
              ctx,
              itemName,
              config
            );
            if (res) {
              return `已尝试截图冰保存至本地,请前往以下网址查看:${publicPath}`;
            } else {
              return `截图失败,请联系开发者或再试一次...`;
            }
          } else {
            const awserList: number[] = [1, 2, 3, 4, 5];
            let [
              one = "待选1",
              two = "待选2",
              three = "待选3",
              four = "待选4",
              five = "待选5",
            ] = title;
            session.send(
              `喔,出现了一丢丢错误,没有在wiki里找到你需要的物品,以下是相近的物品:\n1. ${one}\n2. ${two}\n3. ${three}\n4. ${four}\n5. ${five}\n请输入序号选择`
            );
            const awser =
              +(await session.prompt(50 * 1000))
                ?.replace(/\s+/g, "")
                ?.slice(-1) || NaN;
            if (awserList.includes(awser)) {
              let res = await lib.screenShot(
                res_url[awser - 1],
                ctx,
                title[awser - 1],
                config
              );
              if (res) {
                return `已尝试截图保存至本地,请前往以下网址查看:${
                  config.imgPublicPath +
                  title[awser - 1]
                    .replace(/\//g, "-")
                    .replace(/:/g, "-")
                    .replace(/'/g, "-")
                }.jpeg`;
              }
            } else if (Number.isNaN(awser)) {
              return `已完结本轮查询。如需，如有需要，请重新发起查询.`;
            }
          }
        }
      }
    });
}
