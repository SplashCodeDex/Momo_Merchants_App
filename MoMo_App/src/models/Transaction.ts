import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Transaction extends Model {
  static table = 'transactions';

  @field('type') type: string;
  @field('amount') amount: number;
  @field('description') description: string;
  @date('timestamp') timestamp: Date;
  @field('balance') balance?: number;
}