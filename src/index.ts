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
    0.0.2 添加Md模板支持
    0.0.1 初始化
`;

export interface Config {
  API: string;
  imgLocalPath: string;
  imgPublicPath: string;
  mdId: string;
}

export const Config: Schema<Config> = Schema.object({
  API: Schema.string()
    .description("API地址")
    .default("https://noita.wiki.gg/zh/api.php"),
  imgLocalPath: Schema.string()
    .description("图片保存路径")
    .default(`/root/noitaImgs/`),
  imgPublicPath: Schema.string()
    .description("图片公网路径")
    .default(`https://test.com/`),
  mdId: Schema.string().default("102019091_1708758661").description("模板ID"),
});

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger("noita-wiki-qq");
  ctx
    // 指令注册
    .command("noitawiki <itemName:string>", "wiki查询")
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
        await session.bot.internal.sendMessage(session.guildId, {
          content: "111",
          msg_type: 2,
          markdown: {
            custom_template_id: config.mdId,
            params: [
              {
                key: "text1",
                values: [
                  `文件缓存已命中，缓存时间为：${lib.getFileModifyTime(
                    filePath
                  )} 请前往以下网址查看:[🔗${itemName}`,
                ],
              },
              {
                key: "text2",
                values: [
                  `](${
                    config.imgPublicPath +
                    itemName
                      .replace(/\//g, "-")
                      .replace(/:/g, "-")
                      .replace(/'/g, "-")
                  }.jpeg)`,
                ],
              },
            ],
          },
          keyboard: {
            content: {
              rows: [
                {
                  buttons: [
                    {
                      id: "1",
                      render_data: {
                        label: "我也要查wiki",
                        visited_label: "我也要查wiki",
                      },
                      action: {
                        type: 2,
                        permission: {
                          type: 2,
                        },
                        unsupport_tips: "兼容文本",
                        data: "/noitawiki",
                        enter: false,
                      },
                    },
                  ],
                },
              ],
            },
          },
          msg_id: session.messageId,
          timestamp: session.timestamp,
          msg_seq: Math.floor(Math.random() * 500),
        });
        return;
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
              await session.bot.internal.sendMessage(session.guildId, {
                content: "111",
                msg_type: 2,
                markdown: {
                  custom_template_id: config.mdId,
                  params: [
                    {
                      key: "text1",
                      values: [
                        `文件缓存已命中，缓存时间为：${lib.getFileModifyTime(
                          filePath
                        )} 请前往以下网址查看:[🔗${itemName}`,
                      ],
                    },
                    {
                      key: "text2",
                      values: [
                        `](${
                          config.imgPublicPath +
                          itemName
                            .replace(/\//g, "-")
                            .replace(/:/g, "-")
                            .replace(/'/g, "-")
                        }.jpeg)`,
                      ],
                    },
                  ],
                },
                keyboard: {
                  content: {
                    rows: [
                      {
                        buttons: [
                          {
                            id: "1",
                            render_data: {
                              label: "我也要查wiki",
                              visited_label: "我也要查wiki",
                            },
                            action: {
                              type: 2,
                              permission: {
                                type: 2,
                              },
                              unsupport_tips: "兼容文本",
                              data: "/noitawiki",
                              enter: false,
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
                msg_id: session.messageId,
                timestamp: session.timestamp,
                msg_seq: Math.floor(Math.random() * 500),
              });
              return;
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
            // session.send(
            //   `喔,出现了一丢丢错误,没有在wiki里找到你需要的物品,以下是相近的物品:\n1. ${one}\n2. ${two}\n3. ${three}\n4. ${four}\n5. ${five}\n请输入序号选择`
            // );
            await session.bot.internal.sendMessage(session.guildId, {
              content: "111",
              msg_type: 2,
              markdown: {
                custom_template_id: config.mdId,
                params: [
                  {
                    key: "text1",
                    values: ["Oh,No,出现了一丢丢问题"],
                  },
                  {
                    key: "text2",
                    values: [
                      "没有找到您查询的关键字,以下是自主搜索的结果,你康康有没有需要的,点击按钮选择,没有的话,请等待超时结束本轮查询以减轻服务器压力",
                    ],
                  },
                  {
                    key: "text3",
                    values: [`占位`],
                  },
                  {
                    key: "text4",
                    values: [`1- ${one}`],
                  },
                  {
                    key: "text5",
                    values: [`2- ${two}`],
                  },
                  {
                    key: "text6",
                    values: [`3- ${three}`],
                  },
                  {
                    key: "text7",
                    values: [`4- ${four}`],
                  },
                  {
                    key: "text8",
                    values: [`5- ${five}`],
                  },
                ],
              },
              keyboard: {
                content: {
                  rows: [
                    {
                      buttons: [
                        {
                          id: "1",
                          render_data: {
                            label: `①`,
                            visited_label: `①`,
                          },
                          action: {
                            type: 2,
                            permission: {
                              type: 2,
                            },
                            unsupport_tips: "兼容文本",
                            data: "1",
                            enter: true,
                          },
                        },
                        {
                          id: "2",
                          render_data: {
                            label: `②`,
                            visited_label: `②`,
                          },
                          action: {
                            type: 2,
                            permission: {
                              type: 2,
                            },
                            unsupport_tips: "兼容文本",
                            data: "2",
                            enter: true,
                          },
                        },
                        {
                          id: "3",
                          render_data: {
                            label: `③`,
                            visited_label: `③`,
                          },
                          action: {
                            type: 2,
                            permission: {
                              type: 2,
                            },
                            unsupport_tips: "兼容文本",
                            data: "3",
                            enter: true,
                          },
                        },
                        {
                          id: "4",
                          render_data: {
                            label: `④`,
                            visited_label: `④`,
                          },
                          action: {
                            type: 2,
                            permission: {
                              type: 2,
                            },
                            unsupport_tips: "兼容文本",
                            data: "4",
                            enter: true,
                          },
                        },
                        {
                          id: "5",
                          render_data: {
                            label: `⑤`,
                            visited_label: `⑤`,
                          },
                          action: {
                            type: 2,
                            permission: {
                              type: 2,
                            },
                            unsupport_tips: "兼容文本",
                            data: "5",
                            enter: true,
                          },
                        },
                      ],
                    },
                    {
                      buttons: [
                        {
                          id: "1",
                          render_data: {
                            label: "我也要查wiki",
                            visited_label: "我也要查wiki",
                          },
                          action: {
                            type: 2,
                            permission: {
                              type: 2,
                            },
                            unsupport_tips: "兼容文本",
                            data: "/noitawiki",
                            enter: false,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
              msg_id: session.messageId,
              timestamp: session.timestamp,
              msg_seq: Math.floor(Math.random() * 500),
            });
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
                await session.bot.internal.sendMessage(session.guildId, {
                  content: "111",
                  msg_type: 2,
                  markdown: {
                    custom_template_id: config.mdId,
                    params: [
                      {
                        key: "text1",
                        values: [
                          `文件缓存已命中，缓存时间为：${lib.getFileModifyTime(
                            filePath
                          )} 请前往以下网址查看:[🔗${itemName}`,
                        ],
                      },
                      {
                        key: "text2",
                        values: [
                          `](${
                            config.imgPublicPath +
                            itemName
                              .replace(/\//g, "-")
                              .replace(/:/g, "-")
                              .replace(/'/g, "-")
                          }.jpeg)`,
                        ],
                      },
                    ],
                  },
                  keyboard: {
                    content: {
                      rows: [
                        {
                          buttons: [
                            {
                              id: "1",
                              render_data: {
                                label: "我也要查wiki",
                                visited_label: "我也要查wiki",
                              },
                              action: {
                                type: 2,
                                permission: {
                                  type: 2,
                                },
                                unsupport_tips: "兼容文本",
                                data: "/noitawiki",
                                enter: false,
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                  msg_id: session.messageId,
                  timestamp: session.timestamp,
                  msg_seq: Math.floor(Math.random() * 500),
                });
                return;
              }
            } else if (Number.isNaN(awser)) {
              return `已完结本轮查询。如需，如有需要，请重新发起查询.`;
            }
          }
        }
      }
    });
}
