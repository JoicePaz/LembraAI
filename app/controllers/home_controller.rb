class HomeController < ApplicationController
  def index
    @has_decks = Deck.table_exists? && Deck.where(owner_token: current_owner_token).exists?
  end
end
