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

import fs from "fs";
import { Context, Row } from "koishi";
import puppeteer from "koishi-plugin-puppeteer";
import { Config } from ".";

/**
 * 检查文件是否存在
 * @param filePath 文件路径
 * @returns true:存在 false:不存在
 */
export function checkFileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * @desc 获取文件修改时间
 * @param filePath 文件路径
 * @returns string 文件修改时间
 */
export function getFileModifyTime(filePath: string): string {
  const stats = fs.statSync(filePath);
  const fileModifiedTime = stats.mtime.getTime();
  return new Date(fileModifiedTime).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
}

/**
 * @desc 截屏
 * @param url 截屏地址
 * @param ctx 上下文
 * @param config 配置
 * @param itemName 物品名称
 * @returns string
 */
export async function screenShot(
  url: string,
  ctx: Context,
  itemName: string,
  config: Config
) {
  if (!url) {
    return false;
  } else {
    const page = await ctx.puppeteer.page();
    await page.goto(url, {
      timeout: 0,
    });
    await delay(5000);
    await page.addStyleTag({
      // 添加详情页边框
      content: "#mw-content-text{padding: 40px}",
    });
    await delay(3000);

    const selector = await page.$("#mw-content-text");
    await delay(2000);
    return await selector
      .screenshot({
        type: "jpeg",
        quality: 80,
        path: `${config.imgLocalPath}${itemName
          .replace(/\//g, "-")
          .replace(/:/g, "-")
          .replace(/'/g, "-")}.jpeg`,
      })
      .then(async () => {
        // console.info(`截图成功...`);
        return true;
      })
      .catch((err) => {
        console.error(err);
        return false;
      })
      .finally(async () => {
        await page.close();
      });
  }
}

/**
 *
 * @param ms 延迟毫秒数
 * @returns void
 */
export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @desc 从wiki.gg获取搜索数据
 * @returns []
 */
export async function getFromWikigg(
  url: string,
  ctx: Context,
  itemName: string
) {
  return await ctx.http
    .get(url, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
      },
      params: {
        action: `opensearch`,
        search: itemName,
        limit: 5,
        redirects: "return",
        format: "json",
      },
    })
    .then(async (res) => {
      console.log(res);
      return [res[1], res[3]];
    })
    .catch((err) => {
      console.error(err);
      return [];
    });
}
