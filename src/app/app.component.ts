import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  private fileText: string = null;

  async onChangeFile(evt) {
    const file = evt.target.files[0];

    this.fileText = await this.fileToText(file);
  }

  onSubmit() {
    // ファイルが選択されていなければ何もしない
    if (!this.fileText) {
      return;
    }

    // e-ltax用のCSVデータを作成する
    const csv = this.getEltaxData();

    // e-ltax用のCSVをダウンロードする
    this.download(csv);
  }

  private async download(csv: string): Promise<void> {
    // CSVをBlobに変換する
    const bom = '\uFEFF';
    const blob = new Blob([bom, csv], { type: 'text/csv' });

    // ダウンロードリンクを作成する
    const anchor: any = document.createElement('a');

    // ファイルをダウンロードする(IEでは動かない)
    anchor.download = 'eltaxdata.csv';
    anchor.href = window.URL.createObjectURL(blob);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.parentNode.removeChild(anchor);
  }

  getEltaxData(): string {
    // データレコード数を算出する
    const recordnum: number = (this.fileText.length - 120 - 120 - 120) / 120;

    // ヘッダーレコードを取得する
    const header: string = this.fileText.substr(0, 120);
    // データレコードを取得する
    const record: string[] = [];
    for (let i = 0 ; i < recordnum ; i++) {
      record.push(this.fileText.substr(120 + (i * 120), 120));
    }
    // トレーラーレコードを取得する
    const trailer: string = this.fileText.substr(120 + (recordnum * 120), 120);
    // エンドレコードを取得する
    const end: string = this.fileText.substr(120 + (recordnum * 120) + 120, 120);

    // 納付月分を算出する
    // 2020年1月は3201とすると記載がある
    // 2020年3月も3203でないとエラーになる
    // 年が令和2だったら平成32年とすることにする
    // その後のことは不明
    let year = parseInt(header.substr(23, 2), 10);
    if (year === 1 || year === 2) {
      year += 30;
    }
    const month = parseInt(header.substr(25, 2), 10);
    const ym = year.toString().padStart(2, '0') + month.toString().padStart(2, '0');

    // ヘッダーレコードを作成する
    const header2: string[] = (new Array(10)).fill('');
    // データ区分
    header2[0] = header.substr(0, 1).trim();
    // 種別コード
    header2[1] = header.substr(1, 2).trim();
    // 使用コード
    header2[2] = header.substr(3, 1).trim();
    // 委託者コード
    header2[3] = header.substr(4, 10).trim();
    // 取引支店番号
    header2[4] = header.substr(14, 3).trim();
    // 納期限
    header2[5] = header.substr(17, 6).trim();
    // 納付月分
    header2[6] = ym;
    // 特別徴収義務者名
    header2[7] = header.substr(27, 40).trim();
    // 特別徴収義務者の所在地
    header2[8] = header.substr(67, 50).trim();

    // データレコードを作成する
    const records2: string[] = new Array(recordnum);
    for (let i = 0 ; i < recordnum ; i++) {
      const record2: string[] = (new Array(12)).fill('');
      // データ区分
      record2[0] = '3';
      // 市区町村コード
      record2[1] = record[i].substr(1, 6).trim();
      // 納付月分
      record2[2] = ym;
      // 指定番号
      record2[3] = record[i].substr(22, 15).trim();
      // 給付税額(件数)
      record2[4] = parseInt(record[i].substr(38, 5), 10).toString();
      // 給付税額(金額)
      record2[5] = parseInt(record[i].substr(43, 9), 10).toString();
      // 督促手数料(金額)
      record2[6] = '0';
      // 延滞金(金額)
      record2[7] = '0';
      // 合計税額(件数)
      record2[8] = parseInt(record[i].substr(66, 5), 10).toString();
      // 合計税額(金額)
      record2[9] = parseInt(record[i].substr(71, 9), 10).toString();

      records2[i] = record2.join(',');
    }

    // トレーラーレコードを作成する
    const trailer2: string[] = (new Array(8)).fill('');
    // データ区分
    trailer2[0] = trailer.substr(0, 1).trim();
    // 給与税額合計(件数)
    trailer2[1] = parseInt(trailer.substr(1, 7), 10).toString();
    // 給与税額合計(金額)
    trailer2[2] = parseInt(trailer.substr(8, 11), 10).toString();
    // 退職税額合計(件数)
    trailer2[3] = parseInt(trailer.substr(19, 7), 10).toString();
    // 退職税額合計(金額)
    trailer2[4] = parseInt(trailer.substr(26, 11), 10).toString();
    // 合計税額(件数)
    trailer2[5] = parseInt(trailer.substr(37, 7), 10).toString();
    // 合計税額(金額)
    trailer2[6] = parseInt(trailer.substr(44, 11), 10).toString();

    // エンドレコードを作成する
    const end2: string[] = (new Array(2)).fill('');
    end2[0] = end.substr(0, 1).trim();

    // e-ltax用のCSVデータを作成する
    let eltaxdata: string = header2.join(',') + '\r\n';
    eltaxdata += records2.join('\r\n') + '\r\n';
    eltaxdata += trailer2.join(',') + '\r\n';
    eltaxdata += end2.join(',') + '\r\n';

    return eltaxdata;
  }

  fileToText(file): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result.toString());
      };
      reader.onerror = () => {
        reject(reader.error);
      };

      reader.readAsText(file, 'shift-jis');
    });
  }
}
