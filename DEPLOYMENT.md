# 森希Valorant 服务器上线手册（v1.6.0）

适用：阿里云/腾讯云中国内地服务器，Ubuntu 24.04 LTS x86_64，独立域名，单机 Docker Compose。更新日期：2026-11-11。所有服务器命令在 SSH 登录后的 Bash 中执行；示例域名、邮箱、IP 必须替换。

## 1. 云资源、备案与域名

- 建议起步 2核4GB、40GB以上SSD。此为小规模使用及单文件转码的工程估算，不是容量保证；视频增长时监控磁盘、带宽和CPU后扩容。应用限制同时只处理一个媒体文件。
- 中国内地节点通过所选云厂商办理域名实名与ICP备案；购买前核对服务器套餐是否具备备案资格，备案通过后再正式开放域名访问。个人/企业主体及广告经营等具体要求以接入商审核为准。
- 将计划使用的一个域名（例如 valorant.example.com）的 A 记录指向公网 IPv4。没有可用 IPv6 时不要配置 AAAA。先直接解析到源站，不在前面叠加 CDN。
- 云安全组/轻量防火墙放行 TCP 80、443，UDP 443 可选；SSH TCP 22 限制为你自己的管理IP。不要开放 8787、8788、2375 或数据库端口。
- Docker 发布的端口可能绕过 UFW，云安全组是第一道访问边界。本配置只对外发布 Caddy 的80/443，应用无宿主机映射端口。
- 备案成功后在 .env 填写真实 ICP_NUMBER；公安备案如已办理，填写 PUBLIC_SECURITY_NUMBER 与纯数字 PUBLIC_SECURITY_CODE。网站页脚会显示对应官方查询链接，不能填示例或虚构备案号。

## 2. 安装环境

使用全新 Ubuntu 主机。若已有宝塔/Nginx/Caddy/Apache占用80或443，请先规划端口和迁移，不要同时启动两套代理。

按 Docker 官方 Ubuntu apt 仓库安装说明安装 Docker Engine 和 Compose 插件：
https://docs.docker.com/engine/install/ubuntu/

不要直接用未知来源的一键脚本。安装完成后：

```bash
sudo -i
apt-get update
apt-get install -y git openssl curl ca-certificates
systemctl enable --now docker
docker version
docker compose version
```

下文默认在该管理员 shell 中执行。容器内应用以 node 普通用户运行，非 root。Node 24 与系统 FFmpeg 已包含于项目镜像，不需要在宿主机另装 Node。

## 3. 获取代码并配置

```bash
mkdir -p /opt/senxi
cd /opt/senxi
git clone https://github.com/gusenxi4532/ValorantMap.git app
cd app
git checkout v1.6.0
cp .env.example .env
chmod 600 .env
install -d -m 700 secrets backups
openssl rand -base64 24 > secrets/admin_password.txt
chmod 444 secrets/admin_password.txt
nano .env
```

secrets目录为700，密码文件为444是为了让容器内非root进程读取挂载的secret，其他宿主机普通用户无法穿过该目录。请用密码管理器妥善保存密码，不贴到聊天或日志中，不提交Git。仅首次初始化使用这个密码文件；已有账号以后在后台改密码，修改secret不会重置已有账号。

.env 至少修改：

```dotenv
DOMAIN=valorant.example.com
ACME_EMAIL=你的真实证书通知邮箱
ADMIN_USERNAME=admin
APP_VERSION=1.6.0
MEDIA_QUOTA_MB=10240
DATA_VOLUME_NAME=senxi-valorant-data
ICP_NUMBER=你的真实备案号
PUBLIC_SECURITY_NUMBER=
PUBLIC_SECURITY_CODE=
```

DOMAIN 只填域名，不带协议、端口或路径。媒体默认配额10GB，上传时额外预留临时处理空间；总磁盘建议留出至少20%空闲。网络段172.30.90.0/24如果与现有网络冲突，同时修改compose中的子网、两个固定IP以及TRUSTED_PROXY_IPS。

## 4. 构建并首次启动

全新站点直接执行；迁移现有桌面数据请先看第7节，先恢复数据再启动。

```bash
docker compose config --quiet
docker compose build --pull
docker compose up -d
docker compose ps
docker compose logs --tail=100 app caddy
curl -fsS https://valorant.example.com/healthz
```

健康接口应返回 ok:true、version:1.6.0。Caddy在域名解析正确、80/443畅通后自动申请和续期证书。首次证书签发可能需要片刻。

国内网络如果无法访问 GitHub、Docker Hub、npm 或 Debian 软件源：在可访问的可信构建机上检出同一标签，构建镜像并保存，再通过SCP传输；不使用来历不明的公共镜像替代。

```bash
# 可信x86_64构建机上
docker build --pull -t senxi-valorant:1.6.0 .
docker pull caddy:2
docker save -o senxi-images.tar senxi-valorant:1.6.0 caddy:2
sha256sum senxi-images.tar > senxi-images.tar.sha256
# 服务器上传后
sha256sum -c senxi-images.tar.sha256
docker load -i senxi-images.tar
docker compose up -d --no-build --pull never
```

代码也可上传Release的ZIP并解压。离线镜像应定期在可信环境重新构建，获得系统安全更新。

## 5. 上线验收

- 打开 https://你的域名/ ：游客免登录，地图、道具、准星与顶部广告加载正常。
- 打开 https://你的域名/admin.html ：使用初始化账号与密码登录，确认登录Cookie具有Secure、HttpOnly、SameSite=Strict。
- 保存一条测试广告，使用另一浏览器或无痕窗口核对10秒内同步；测试完成后删除测试广告。
- 校准一个点位，核对游客3秒内同步；上传一张图片和短视频，发布后验证游客观看与拖动进度条；未发布附件应返回404。
- 测试修改密码、退出登录、游客写入被拒绝，重启后重新登录。
- 页脚显示真实备案信息；访问 /storage/state.json 应返回404，公网访问8787/8788应失败。
- 执行一次备份，再在新的空数据卷演练恢复后，才视为完成上线。

## 6. 日常运行、备份、更新与回滚

```bash
cd /opt/senxi/app
docker compose logs --tail=100 app
docker compose exec app node scripts/storage-audit.cjs
df -h
bash deploy/backup.sh
```

备份脚本短暂停止应用，打包数据、账号及媒体，再自动启动；生成tar.gz及SHA256。备份包含敏感账号哈希和私有媒体，只放在受保护的目录，并加密复制到异地。建议每日低峰期备份，保留最近7日与每周副本，实际频率按可接受的数据丢失量调整。脚本不会自动删除备份；需要监控备份盘容量。另行加密备份.env与secrets，不放在网站目录中公开。

只读存储检查会列出缺失媒体和未引用文件。未引用文件可能是未保存草稿，不自动删除。配额不足时先审查报告，再扩容或在停机备份后维护存储。

更新示例（将新标签和.env的APP_VERSION改为同一个版本）：

```bash
bash deploy/backup.sh
git fetch --tags
git checkout v下一版本
nano .env
docker compose build --pull
docker compose up -d
curl -fsS https://你的域名/healthz
```

只更新代码不会删除数据卷。禁止执行 docker compose down -v 或未经检查的 volume prune。当前JSON存储只支持单应用实例，不使用PM2集群、多副本或多个容器同时写同一数据卷。扩展到多机前需改为数据库与共享对象存储。会话在内存中，服务重启会退出所有管理员，这是预期行为。

回滚：切回已验证的旧标签和对应APP_VERSION，重新构建/启动；若新版本改变了数据结构，则先停止服务，将.env中DATA_VOLUME_NAME改为新的卷名，然后从兼容旧版本的备份恢复。原数据卷保留供核查。

```bash
docker compose down  # 不加-v
nano .env            # DATA_VOLUME_NAME改为未使用的新名字
bash deploy/restore.sh backups/你的备份.tar.gz
docker compose up -d
```

restore.sh检查SHA256，拒绝覆盖非空数据卷。只使用自己生成且确认来源的备份。恢复后再次执行第5节验收。

## 7. 将桌面项目迁移到服务器

1. 更新并启动本地v1.6.0，在后台将密码设置为至少12字符。新版会记录强密码状态；生产环境拒绝旧默认密码或没有该标记的账号。该检查不会自动修改你的密码。
2. 关闭本地Node服务，确保无人写入。完整打包 storage 目录内部内容，包含 state.json、lineups.json、crosshairs.json、advertising.json 和 uploads；不能只传dist或只传图片。
3. 在Windows PowerShell中执行（按实际路径调整）：

```powershell
Set-Location 'C:\Users\顾森希\Desktop\Valorant地图工具'
tar -czf senxi-data.tar.gz -C storage .
$hash = (Get-FileHash -LiteralPath senxi-data.tar.gz -Algorithm SHA256).Hash.ToLower()
[IO.File]::WriteAllText((Join-Path $PWD 'senxi-data.tar.gz.sha256'), $hash + '  senxi-data.tar.gz' + "`n")
scp senxi-data.tar.gz senxi-data.tar.gz.sha256 你的SSH用户@服务器IP:/安全的暂存目录/
```

4. 服务器完成第3节后构建镜像，但先不启动app，将备份与校验文件放入backups目录，运行 restore.sh。新卷应为空。再 docker compose up -d。
5. 上传索引中的Windows反斜杠路径会自动兼容Linux。验证所有截图、视频和地图校准结果；游客收藏属于其浏览器本地存储，更换域名不会自动迁移。
6. 原桌面备份在完成服务器验收前保留。备份不要提交Git；本项目.gitignore不覆盖任意命名的临时备份，完成转移后将其放到项目外的安全目录。

## 8. 常见故障

| 现象 | 检查与处理 |
| --- | --- |
| HTTPS无法签发 | DNS A/AAAA、云安全组80/443、域名备案接入状态、现有端口占用、caddy日志 |
| 启动拒绝默认密码 | 新部署检查secret；迁移站点先在新版本地后台设置强密码再打包 |
| 403 请求来源无效 | .env域名是否等于实际访问域名；不要混用IP/其他子域名或HTTP访问后台 |
| 登录频繁429 | 每IP每15分钟限10次；等待窗口。只信任配置的代理，勿向公网暴露应用端口 |
| 上传507 | 媒体配额或磁盘预留不足；检查MEDIA_QUOTA_MB、df -h与只读存储报告 |
| 上传400/进程重启 | 查看app日志、文件格式、时长≤3分钟、内存限制；图片≤20MB、视频≤200MB |
| 上传后游客看不到 | 附件必须关联已发布内容；草稿媒体不会公开 |
| 部署后内容恢复初始 | 检查DATA_VOLUME_NAME是否改变、是否漏传storage、账号/卷权限 |
| GitHub Pages不能登录 | Pages仅静态展示；完整后台请访问本服务器域名 |

## 9. 参考来源

- 阿里云ICP备案：https://www.alibabacloud.com/help/en/icp-filing
- 腾讯云轻量服务器限制：https://cloud.tencent.com/document/product/1207/44376
- Docker Ubuntu安装及防火墙说明：https://docs.docker.com/engine/install/ubuntu/
- Docker Compose生产部署：https://docs.docker.com/compose/how-tos/production/
- Caddy自动HTTPS：https://caddyserver.com/docs/automatic-https
- Caddy反向代理：https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Node LTS版本：https://nodejs.org/en/about/previous-releases

本次完成代码、配置与自动化验证，不代表已购买云主机、完成备案或部署到你的云账号；这些步骤需要实际服务器、域名及访问凭据。
