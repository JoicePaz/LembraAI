Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  resources :decks, only: [:index, :new, :create, :edit, :update, :destroy] do
    collection do
      get :start
    end

    member do
      get :practice
    end
  end
  root "home#index"
end
