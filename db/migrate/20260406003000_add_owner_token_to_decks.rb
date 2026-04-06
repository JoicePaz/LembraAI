class AddOwnerTokenToDecks < ActiveRecord::Migration[7.1]
  class MigrationDeck < ApplicationRecord
    self.table_name = "decks"
  end

  def up
    add_column :decks, :owner_token, :string, limit: 64
    add_index :decks, :owner_token

    MigrationDeck.reset_column_information
    MigrationDeck.where(owner_token: nil).update_all(owner_token: "legacy-shared")

    change_column_null :decks, :owner_token, false
  end

  def down
    remove_index :decks, :owner_token
    remove_column :decks, :owner_token
  end
end
